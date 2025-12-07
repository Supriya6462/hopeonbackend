import { User } from "../models/User.model.js";
import { Otp } from "../models/Otp.model.js";
import { Role, OtpPurpose } from "../types/enums.js";
import { hashPassword, comparePassword } from "../utils/password.util.js";
import { generateToken } from "../utils/jwt.util.js";

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

    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
      phoneNumber: phoneNumber || undefined,
      role: Role.DONOR,
      isOrganizerApproved: false,
    });

    const token = generateToken(user._id.toString());

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        image: user.image,
        isOrganizerApproved: user.isOrganizerApproved,
      },
      token,
    };
  }

  async login(data: LoginInput) {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const token = generateToken(user._id.toString());

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        image: user.image,
        isOrganizerApproved: user.isOrganizerApproved,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateProfile(userId: string, updates: Partial<RegisterInput>) {
    const { password, ...otherUpdates } = updates;

    const updateData: any = { ...otherUpdates };

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async generateOTP(email: string, purpose: OtpPurpose) {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email,
      otpCode,
      purpose,
      expiresAt,
      isUsed: false,
    });

    return { message: "OTP sent to email", otpCode };
  }

  async verifyOTP(email: string, otpCode: string, purpose: OtpPurpose) {
    const otp = await Otp.findOne({
      email,
      otpCode,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new Error("Invalid or expired OTP");
    }

    otp.isUsed = true;
    await otp.save();

    return { message: "OTP verified successfully" };
  }
}

export const authService = new AuthService();
