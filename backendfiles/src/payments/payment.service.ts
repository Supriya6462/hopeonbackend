import mongoose from "mongoose";
import { Donation } from "../models/Donation.model";
import { Campaign } from "../models/Campaign.model.js";
import { DonationStatus, PaymentProvider } from "../types/enums";
import { InitiatePaymentDTO } from "./dto/initiate-payment.dto";
import { VerifyPaymentDTO } from "./dto/verify-payment.dto";
import { ApiError } from "../utils/ApiError";
import {
  createInAppNotification,
  NotificationEventType,
} from "../services/notification.service.js";
import { recordDonationBlock } from "../services/blockchain.service.js";
import { PaymentFactory } from "./payment.factory";

export class PaymentService {
  async initiate(
    userId: string,
    payload: Omit<InitiatePaymentDTO, "amount" | "currency"> & {
      provider?: PaymentProvider;
    },
  ) {
    // Validate donation exists
    const donation = await Donation.findById(payload.donationId);
    if (!donation) {
      throw new ApiError("Donation not found", 404, "DONATION_NOT_FOUND");
    }

    // Verify ownership
    if (donation.donor.toString() !== userId) {
      throw new ApiError(
        "Unauthorized to initiate payment for this donation",
        403,
        "UNAUTHORIZED",
      );
    }

    // Check donation status
    if (donation.status !== DonationStatus.PENDING) {
      throw new ApiError(
        "Donation already processed",
        400,
        "DONATION_ALREADY_PROCESSED",
      );
    }

    // Get payment provider strategy from donation method or override
    const strategy = PaymentFactory.create(
      (payload.provider as PaymentProvider) ||
        (donation.method as PaymentProvider),
    );

    // Initiate payment with provider
    const result = await strategy.initiate({
      donationId: donation._id.toString(),
      amount: donation.amount,
      currency: "USD",
      returnUrl: payload.returnUrl,
    });

    // Save provider-specific IDs when returned
    if (result.formData) {
      if (result.formData.orderId) {
        donation.transactionId = result.formData.orderId;
        donation.paypalOrderId = result.formData.orderId;
      }
      if (result.formData.pidx) {
        donation.khaltiPidx = result.formData.pidx;
        if (donation.khaltiPidx)
          donation.transactionId = donation.khaltiPidx as string;
      }
      if (result.formData.transaction_uuid || result.formData.esewa_txn_uuid) {
        donation.esewaTransactionUuid =
          result.formData.transaction_uuid || result.formData.esewa_txn_uuid;
        if (donation.esewaTransactionUuid)
          donation.transactionId = donation.esewaTransactionUuid as string;
      }
    }

    // Fallback: if provider returned a generic transactionId
    if (!donation.transactionId && (result as any).transactionId) {
      donation.transactionId = (result as any).transactionId;
    }

    donation.providerResponse =
      (result as any).rawResponse || result.formData || {};

    await donation.save();

    return result;
  }

  async verifyByDonation(
    donationId: string,
    providerTransactionId?: string,
    provider?: PaymentProvider,
  ) {
    const donation = await Donation.findById(donationId);
    if (!donation) {
      throw new ApiError("Donation not found", 404, "DONATION_NOT_FOUND");
    }

    if (donation.status === DonationStatus.COMPLETED) {
      return { success: true, message: "Payment already verified" };
    }

    const transactionId =
      providerTransactionId ||
      donation.transactionId ||
      donation.paypalOrderId ||
      donation.khaltiPidx ||
      donation.esewaTransactionUuid;
    if (!transactionId) {
      throw new ApiError(
        "Transaction ID missing",
        400,
        "TRANSACTION_ID_MISSING",
      );
    }

    const strategy = PaymentFactory.create(
      (provider as PaymentProvider) || (donation.method as PaymentProvider),
    );

    const verifyResult = await strategy.verify({
      donationId: donation._id.toString(),
      providerTransactionId: transactionId,
    });

    if (!verifyResult.success) {
      donation.status = DonationStatus.FAILED;
      await donation.save();
      throw new ApiError(
        "Payment verification failed",
        400,
        "PAYMENT_VERIFICATION_FAILED",
      );
    }

    // Transactional update
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      donation.status = DonationStatus.COMPLETED;
      donation.captureDetails = verifyResult.rawResponse || verifyResult;
      donation.transactionId =
        verifyResult.providerTransactionId || transactionId;
      if (donation.method === PaymentProvider.PAYPAL) {
        donation.paypalOrderId = donation.transactionId;
      }
      if (donation.method === PaymentProvider.KHALTI) {
        donation.khaltiPidx = donation.transactionId;
      }
      if (donation.method === PaymentProvider.ESEWA) {
        donation.esewaTransactionUuid = donation.transactionId;
      }

      const donationBlock = await recordDonationBlock({
        donorName: donation.payerName || "Anonymous Donor",
        amount: donation.amount,
        campaignId: donation.campaign,
        donationId: donation._id,
        transactionId: donation.transactionId,
        donatedAt: donation.createdAt.toISOString(),
      });
      donation.blockchainHash = donationBlock.hash;

      await donation.save({ session });

      await Campaign.findByIdAndUpdate(
        donation.campaign,
        { $inc: { raised: donation.amount } },
        { session },
      );

      await session.commitTransaction();

      try {
        const campaign = await Campaign.findById(donation.campaign).select(
          "title owner",
        );

        await createInAppNotification({
          recipient: donation.donor,
          eventType: NotificationEventType.DONATION_COMPLETED,
          title: "Donation Confirmed",
          message: "Your donation payment has been verified successfully.",
          payload: {
            donationId: donation._id,
            campaignId: donation.campaign,
            campaignTitle: campaign?.title,
            amount: donation.amount,
            blockchainHash: donation.blockchainHash,
          },
        });

        if (campaign?.owner) {
          await createInAppNotification({
            recipient: campaign.owner,
            eventType: NotificationEventType.DONATION_RECEIVED,
            title: "New Donation Received",
            message: `A donation was completed for ${campaign.title}.`,
            payload: {
              donationId: donation._id,
              campaignId: campaign._id,
              campaignTitle: campaign.title,
              amount: donation.amount,
              blockchainHash: donation.blockchainHash,
            },
          });
        }
      } catch (notifyError) {
        console.error(
          "Failed to create payment verification notifications:",
          notifyError,
        );
      }

      return { success: true, message: "Payment verified successfully" };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async verify(userId: string, payload: VerifyPaymentDTO) {
    const donation = await Donation.findById(payload.donationId);

    if (!donation) {
      throw new ApiError("Donation not found", 404, "DONATION_NOT_FOUND");
    }

    if (donation.donor.toString() !== userId) {
      throw new ApiError("Unauthorized", 403, "UNAUTHORIZED");
    }

    return this.verifyByDonation(
      payload.donationId,
      payload.providerTransactionId,
      payload.provider as PaymentProvider,
    );
  }
}

export const paymentService = new PaymentService();
