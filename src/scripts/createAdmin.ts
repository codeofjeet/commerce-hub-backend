import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const createAdmin = async (): Promise<void> => {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env",
      );
    }

    if (password.length < 12 || password.length > 72) {
      throw new Error("Admin password must be between 12 and 72 characters");
    }

    await connectDB();

    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("An admin account already exists. No account was created.");
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        "This email already belongs to another account. Choose a different admin email.",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("Admin account created successfully.");
    console.log(`Admin email: ${email}`);
    console.log("Now log in through Swagger.");
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin().catch((error: unknown) => {
  console.error(
    "Admin setup failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
