import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../Models/User.js";
import Role from "../Models/Role.js";
import connectDB from "../db/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const userRegister = async () => {
    await connectDB();

    try {
        console.log("👤 Creating admin role and user...");

        // 1. Create Admin Role first
        const adminRole = await Role.findOne({ name: "Admin" });
        
        let roleId;
        if (adminRole) {
            roleId = adminRole._id;
            console.log("✅ Admin role already exists");
        } else {
            const newRole = new Role({
                name: "Admin",
                description: "System Administrator",
                activityLevel: "Full Admin",
                permissions: [
                    "MANAGE_USERS",
                    "MANAGE_ROLES",
                    "VIEW_SALES",
                    "CREATE_SALES_INVOICE",
                    "MANAGE_SALES_RETURN",
                    "VIEW_INVENTORY",
                    "MANAGE_PRODUCTS",
                    "MANAGE_WAREHOUSE",
                    "VIEW_ACCOUNTS",
                    "CREATE_JOURNAL_ENTRY",
                    "MANAGE_CHART_ACCOUNTS",
                    "VIEW_REPORTS",
                    "MANAGE_COMPANY_SETTINGS",
                    "MANAGE_SYSTEM_SETTINGS",
                ]
            });
            const savedRole = await newRole.save();
            roleId = savedRole._id;
            console.log("✅ Admin role created successfully");
        }

        // 2. Create Admin User
        const existingUser = await User.findOne({ username: "admin" });
        if (existingUser) {
            console.log("⚠️  Admin user already exists");
        } else {
            const hashPassword = await bcrypt.hash("admin123", 10);

            const newUser = new User({
                username: "admin",
                email: "admin@nexiserp.com",
                password: hashPassword,
                fullName: "System Administrator",
                phone: "+1-555-0000",
                role: roleId,
                status: "active"
            });

            await newUser.save();
            console.log("✅ Admin user created successfully");
        }

        console.log("\n📋 Credentials:");
        console.log("   Username: admin");
        console.log("   Password: admin123");
        console.log();
        
    } catch (error) {
        console.error("❌ Error seeding user:", error.message);
        throw error;
    }
}

export default userRegister;

// Run as standalone script
const isStandaloneScript = import.meta.url === `file://${process.argv[1]}` || 
                           process.argv[1]?.includes('userSeed.js');

if (isStandaloneScript) {
  console.log("🚀 Starting user seeder...");
  userRegister()
    .then(async () => {
      console.log("✓ User seeding complete");
      try {
        await mongoose.connection.close();
      } catch (e) {
        // Connection already closed
      }
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("✗ User seeding failed:", err);
      try {
        await mongoose.connection.close();
      } catch (e) {
        // Connection already closed
      }
      process.exit(1);
    });
}