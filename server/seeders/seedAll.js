import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import userRegister from "./userSeed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedAll = async () => {
  try {
    console.log("🌱 Starting seed process...\n");

    // Connect to database once
    await connectDB();
    console.log("✅ Database connected\n");

    // Run user seed
    console.log("📝 Seeding users...");
    await userRegister();
    console.log("✅ Users seeded\n");

    // Add more seeders here as needed
    // console.log("📦 Seeding products...");
    // await productSeed();
    // console.log("✅ Products seeded\n");

    console.log("✨ All seeds completed successfully!");

  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Connection already closed
    }
  }
};

seedAll();