import mongoose from "mongoose";
import { Donation } from "../models/Donation.model";
import { Campaign } from "../models/Campaign.model.js";
import { DonationStatus } from "../types/enums";
import { InitiatePaymentDTO } from "./dto/initiate-payment.dto";
import { VerifyPaymentDTO } from "./dto/verify-payment.dto";
import { PayPalProvider } from "./providers/paypal.provider";
import { ApiError } from "../utils/ApiError";
import {
  createInAppNotification,
  NotificationEventType,
} from "../services/notification.service.js";
import { recordDonationBlock } from "../services/blockchain.service.js";

export class PaymentService {
  async initiate(
    userId: string,
    payload: Omit<InitiatePaymentDTO, "amount" | "currency">,
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

    // Get payment provider strategy
    const strategy = new PayPalProvider();

    // Initiate payment with provider
    const result = await strategy.initiate({
      donationId: donation._id.toString(),
      amount: donation.amount,
      currency: "USD",
      returnUrl: payload.returnUrl,
    });

    // Save transaction ID if provided (e.g., PayPal orderId, Khalti pidx)
    if (result.formData?.orderId) {
      donation.transactionId = result.formData.orderId;
      donation.paypalOrderId = result.formData.orderId;
    }

    await donation.save();

    return result;
  }

  // async verify(userId: string, payload: VerifyPaymentDTO) {
  //   // Validate donation exists
  //   const donation = await Donation.findById(payload.donationId);
  //     if (!donation) {
  //       throw new ApiError("Donation not found", 404, "DONATION_NOT_FOUND");
  //     }

  //     // Verify ownership
  //     if (donation.donor.toString() !== userId) {
  //     throw new ApiError("Unauthorized to verify payment for this donation", 403, "UNAUTHORIZED");
  //     }

  //   // Check if already completed
  //     if (donation.status === DonationStatus.COMPLETED) {
  //     return { success: true, message: "Payment already verified" };
  //     }

  //     // Use provided transaction ID or fall back to stored one
  //   const transactionId = payload.providerTransactionId || donation.transactionId;
  //   if (!transactionId) {
  //     throw new ApiError("Transaction ID missing", 400, "TRANSACTION_ID_MISSING");
  //     }

  //     // Get payment provider strategy
  //     const strategy = PaymentFactory.create(donation.method);

  //     // Verify payment with provider
  //   const verifyResult = await strategy.verify({
  //         donationId: donation._id.toString(),
  //     providerTransactionId: transactionId,
  //   });

  //     if (!verifyResult.success) {
  //       donation.status = DonationStatus.FAILED;
  //     await donation.save();
  //     throw new ApiError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
  //     }

  //   // Use transaction to ensure data consistency
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     // Update donation status
  //     donation.status = DonationStatus.COMPLETED;
  //     donation.captureDetails = verifyResult.rawResponse;
  //     donation.paymentVerifiedAt = new Date();
  //     donation.transactionId = verifyResult.providerTransactionId;

  //     await donation.save({ session });

  //     // Update campaign raised amount
  //     await Campaign.findByIdAndUpdate(
  //       donation.campaign,
  //       {
  //         $inc: { raised: donation.amount },
  //       },
  //       { session }
  //     );

  //     await session.commitTransaction();

  //     return { success: true, message: "Payment verified successfully" };
  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw error;
  //   } finally {
  //     session.endSession();
  //   }
  // }
  async verify(userId: string, payload: VerifyPaymentDTO) {
    const donation = await Donation.findById(payload.donationId);

    if (!donation) {
      throw new ApiError("Donation not found", 404, "DONATION_NOT_FOUND");
    }

    if (donation.donor.toString() !== userId) {
      throw new ApiError("Unauthorized", 403, "UNAUTHORIZED");
    }

    if (donation.status === DonationStatus.COMPLETED) {
      return { success: true, message: "Payment already verified" };
    }

    const transactionId =
      payload.providerTransactionId || donation.transactionId;

    if (!transactionId) {
      throw new ApiError(
        "Transaction ID missing",
        400,
        "TRANSACTION_ID_MISSING",
      );
    }

    const strategy = new PayPalProvider();

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

    // 🔥 Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Mark as completed
      donation.status = DonationStatus.COMPLETED;
      donation.captureDetails = verifyResult.rawResponse;
      donation.transactionId = verifyResult.providerTransactionId;
      donation.paypalOrderId = verifyResult.providerTransactionId;

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

      return {
        success: true,
        message: "Payment verified successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const paymentService = new PaymentService();
