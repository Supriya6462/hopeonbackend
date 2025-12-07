import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.model.js";
import { hashPassword } from "../utils/password.util.js";
import { Role } from "../types/enums.js";

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log("Connected to database");

    const adminEmail = "admin@fundraiser.com";
    const adminPassword = "Admin@123456"; // Change this!

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("Admin user already exists!");
      process.exit(0);
    }

    // Create admin user
    const passwordHash = await hashPassword(adminPassword);
    await User.create({
      name: "Platform Admin",
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      phoneNumber: "+1234567890",
      isOrganizerApproved: false,
    });

    console.log("✅ Admin user created successfully!");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    console.log("⚠️  Please change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
