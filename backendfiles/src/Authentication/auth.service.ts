import { User } from "../models/User.model.js";
import { Otp } from "../models/Otp.model.js";
import { PendingRegistration } from "../models/PendingRegistration.model.js";
import { Role, OtpPurpose } from "../types/enums.js";
import { hashPassword, comparePassword } from "../utils/password.util.js";
import { generateToken } from "../utils/jwt.util.js";
import { emailService } from "../utils/email.util.js";
import { ApiError } from "../utils/ApiError.js";
import { APIFeatures, QueryString } from "../utils/apiFeatures.js";
import bcrypt from "bcryptjs";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterInput) {
    const { name, email, password, phoneNumber } = data;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      throw new ApiError(
        "Name, email, and password are required",
        400,
        "All_fields_are_required",
      );
    }

    // Check if user already exists in main User collection
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ApiError(
        "User with this email already exists",
        409,
        "User_already_exist",
      );
    }

    // Check if there's already a pending registration
    const existingPending = await PendingRegistration.findOne({
      email: normalizedEmail,
    });
    if (existingPending) {
      // Delete old pending registration to allow new one
      await PendingRegistration.deleteOne({ email: normalizedEmail });
      // Also delete old OTPs
      await Otp.deleteMany({
        email: normalizedEmail,
        purpose: OtpPurpose.REGISTER,
      });
    }

    const passwordHash = await hashPassword(password);

    // Store registration data temporarily (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await PendingRegistration.create({
      name,
      email: normalizedEmail,
      passwordHash,
      phoneNumber: phoneNumber || undefined,
      expiresAt,
    });

    // Generate OTP (valid for 10 minutes)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email: normalizedEmail,
      otpCode: hashedOtp,
      purpose: OtpPurpose.REGISTER,
      expiresAt: otpExpiresAt,
      isUsed: false,
    });

    // Send OTP via email
    try {
      await emailService.sendOTP(normalizedEmail, otpCode, OtpPurpose.REGISTER);
    } catch (error) {
      // If email fails, clean up pending registration
      await PendingRegistration.deleteOne({ email: normalizedEmail });
      await Otp.deleteMany({
        email: normalizedEmail,
        purpose: OtpPurpose.REGISTER,
      });
      throw new ApiError(
        "Failed to send verification email. Please try again.",
        429,
        "OTP_TOO_MANY_REQUESTS",
      );
    }

    return {
      message:
        "Registration initiated. Please check your email for the OTP to complete registration.",
      email: normalizedEmail,
      expiresIn: "10 minutes",
      // otpCode, // Only for development - REMOVE IN PRODUCTION
    };
  }

  async login(data: LoginInput) {
    const { email, password } = data;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new ApiError(
        "Email and password are required",
        401,
        "Email_and_password_are_required",
      );
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new ApiError(
        "Invalid email or password",
        400,
        "USER_INVALID_INPUT",
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ApiError(
        "Please verify your email before logging in. Check your email for the OTP.",
        403,
        "AUTH_EMAIL_NOT_VERIFIED",
      );
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(
        "Invalid email or password",
        400,
        "USER_INVALID_INPUT",
      );
    }

    // const token = generateToken(user._id.toString());

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        image: user.image,
        isOrganizerApproved: user.isOrganizerApproved,
        isEmailVerified: user.isEmailVerified,
      },
      // token,
    };
  }

  async getalluser(queryString: QueryString) {
    const features = new APIFeatures(User, queryString)
      .filter()
      .search(["name", "email"])
      .sort()
      .limitFields()
      .paginate();
    const { results, pagination } = await features.exec();
    return {
      users: results,
      pagination,
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }
    return user;
  }

  async updateProfile(userId: string, updates: Partial<RegisterInput>) {
    const { password, ...otherUpdates } = updates;

    const updateData: any = { ...otherUpdates };

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  async generateOTP(email: string, purpose: OtpPurpose) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new ApiError("Email is required", 400, "EMAIL_REQUIRED");
    }

    // For registration, check if there's pending registration
    if (purpose === OtpPurpose.REGISTER) {
      const pendingReg = await PendingRegistration.findOne({
        email: normalizedEmail,
      });
      if (!pendingReg) {
        throw new ApiError(
          "No pending registration found. Please register first.",
          400,
          "REGISTRATION_PENDING_NOT_FOUND",
        );
      }
    }

    // Delete old OTPs for this email and purpose
    await Otp.deleteMany({ email: normalizedEmail, purpose });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email: normalizedEmail,
      otpCode: hashedOtp,
      purpose,
      expiresAt,
      isUsed: false,
    });

    // Send OTP via email
    try {
      await emailService.sendOTP(normalizedEmail, otpCode, purpose);
    } catch (error) {
      await Otp.deleteMany({ email: normalizedEmail, purpose });
      throw new ApiError(
        "Failed to send OTP email. Please try again.",
        429,
        "OTP_TOO_MANY_REQUESTS",
      );
    }

    return {
      message: "OTP sent to your email",
      expiresIn: "10 minutes",
      // otpCode, // Only for development - REMOVE IN PRODUCTION
    };
  }

  async verifyOTP(email: string, otpCode: string, purpose: OtpPurpose) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !otpCode || !purpose) {
      throw new ApiError(
        "Email, OTP, and purpose are required",
        400,
        "OTP_VALIDATION_INPUT_ERROR",
      );
    }

    const otp = await Otp.findOne({
      email: normalizedEmail,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new ApiError("Invalid or expired OTP", 400, "OTP_EXPIRED");
    }

    const isMatch = await bcrypt.compare(otpCode, otp.otpCode);
    if (!isMatch) {
      throw new ApiError("Invalid or expired OTP", 400, "OTP_INVALID");
    }
    await Otp.findByIdAndUpdate(otp._id, { isUsed: true });
    // If purpose is registration, create the actual user
    if (purpose === OtpPurpose.REGISTER) {
      // Get pending registration data
      const pendingReg = await PendingRegistration.findOne({
        email: normalizedEmail,
      });
      if (!pendingReg) {
        throw new ApiError(
          "Registration data expired. Please register again.",
          500,
          "REGISTRATION_EMAIL_FAILED",
        );
      }

      // Check if user was created in the meantime
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        // Clean up
        await PendingRegistration.deleteOne({ email: normalizedEmail });
        await Otp.deleteOne({ _id: otp._id });
        throw new ApiError(
          "User with this email already exists",
          409,
          "USER_ALREADY_EXISTS",
        );
      }

      // Create the actual user in the database
      const user = await User.create({
        name: pendingReg.name,
        email: pendingReg.email,
        passwordHash: pendingReg.passwordHash,
        phoneNumber: pendingReg.phoneNumber,
        role: Role.DONOR,
        isOrganizerApproved: false,
        isEmailVerified: true, // Already verified via OTP
      });

      // Mark OTP as used
      otp.isUsed = true;
      await otp.save();

      // Clean up pending registration
      await PendingRegistration.deleteOne({ email: normalizedEmail });

      // Generate token
      const token = generateToken(user._id.toString());

      return {
        message: "Registration completed successfully! You can now login.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          image: user.image,
          isOrganizerApproved: user.isOrganizerApproved,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      };
    }

    // For other purposes (like password reset)
    otp.isUsed = true;
    await otp.save();

    return { message: "OTP verified successfully" };
  }
}

export const authService = new AuthService();
