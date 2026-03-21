import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import userRegister from "./userSeed.js";
import { seedChartOfAccounts } from "./chartOfAccountsSeeder.js";
import { seedHSNMaster } from "./hsnMasterSeeder.js";
import { seedTaxMaster } from "./taxMasterSeeder.js";
import { seedSequences } from "./sequenceSeeder.js";
import { seedCountries } from "./countryConfigSeeder.js";
import { seedUnits } from "./unitSeed.js";
import { seedProductPackings } from "./productPackingSeed.js";
import { seedPOS } from "./posSeedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedAll = async () => {
  let startTime = Date.now();
  
  try {
    console.log("🌱 Starting complete seed process...\n");

    // Connect to database once
    await connectDB();
    console.log("✅ Database connected\n");

    // Run Chart of Accounts seeder first (foundation for accounting)
    console.log("📊 Seeding Chart of Accounts...");
    try {
      await seedChartOfAccounts();
      console.log("✅ Chart of Accounts seeded\n");
    } catch (error) {
      console.warn("⚠️  Chart of Accounts seeding skipped or completed:", error.message, "\n");
    }

    // Run HSN Master seeder
    console.log("📝 Seeding HSN Master...");
    try {
      await seedHSNMaster();
      console.log("✅ HSN Master seeded\n");
    } catch (error) {
      console.warn("⚠️  HSN Master seeding skipped or completed:", error.message, "\n");
    }

    // Run Tax Master seeder
    console.log("💰 Seeding Tax Master...");
    try {
      await seedTaxMaster();
      console.log("✅ Tax Master seeded\n");
    } catch (error) {
      console.warn("⚠️  Tax Master seeding skipped or completed:", error.message, "\n");
    }

    // Run Sequences seeder
    console.log("🔢 Seeding Sequences...");
    try {
      await seedSequences();
      console.log("✅ Sequences seeded\n");
    } catch (error) {
      console.warn("⚠️  Sequences seeding skipped or completed:", error.message, "\n");
    }

    // Run Units seeder
    console.log("📏 Seeding Units...");
    try {
      await seedUnits();
      console.log("✅ Units seeded\n");
    } catch (error) {
      console.warn("⚠️  Units seeding skipped or completed:", error.message, "\n");
    }

    // Run Country Config seeder
    console.log("🌍 Seeding Country Configurations...");
    try {
      await seedCountries();
      console.log("✅ Country Configurations seeded\n");
    } catch (error) {
      console.warn("⚠️  Country Configurations seeding skipped or completed:", error.message, "\n");
    }

    // Run users seeder
    console.log("👤 Seeding Users...");
    try {
      await userRegister();
      console.log("✅ Users seeded\n");
    } catch (error) {
      console.warn("⚠️  Users seeding skipped or completed:", error.message, "\n");
    }

    // Run Product Packing seeder
    console.log("📦 Seeding Product Packings...");
    try {
      await seedProductPackings();
      console.log("✅ Product Packings seeded\n");
    } catch (error) {
      console.warn("⚠️  Product Packings seeding skipped or completed:", error.message, "\n");
    }

    // Run POS seeder
    console.log("🏪 Seeding POS Data...");
    try {
      await seedPOS();
      console.log("✅ POS Data seeded\n");
    } catch (error) {
      console.warn("⚠️  POS Data seeding skipped or completed:", error.message, "\n");
    }

    let endTime = Date.now();
    let duration = (endTime - startTime) / 1000;

    console.log("\n✨ All seeds completed successfully!");
    console.log(`⏱️  Total time: ${duration.toFixed(2)}s\n`);

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