import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        const dbUrl = process.env.DATABASE_URL;
        
        if (!dbUrl) {
            throw new Error("DATABASE_URL is not defined in environment variables");
        }

        await mongoose.connect(dbUrl);
        console.log("Database connected successfully");
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
};

export default connectDB;