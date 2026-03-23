/**
 * CREATE_SAMPLE_PRINTER_CONFIG.js
 * Create sample printer configurations for barcode printing
 * Run from server folder with: node CREATE_SAMPLE_PRINTER_CONFIG.js
 */

import mongoose from "mongoose";
import PrinterConfiguration from "./Models/PrinterConfiguration.js";

// Direct MongoDB connection
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/nexiserp";

const SAMPLE_CONFIGS = [
  {
    name: "TSC_BARCODE_38x25",
    legends: "TSC Printer - 38x25mm Label",
    printerModel: "TSC",
    labelWidth: 38,
    labelHeight: 25,
    configTxt: `SIZE 38 MM, 25 MM
DIRECTION 1
REFERENCE 0,0
OFFSET 0 MM
SET TEAR ON
SET CUTTER OFF
SET PARTIAL_CUTTER OFF
SET TEAR_OFFSET 0MM
MEDIA ROLL
LEFT 0
TOP 0
SHIFT 0

TEXT 10,20,"ARIAL.TTF",0,1,1,"{ITEM_NAME}"
BARCODE 10,60,"CODE128",100,1,0,2,4,"{BARCODE}"
TEXT 10,150,"ARIAL.TTF",0,1,1,"Price: {NUMBER_ITEM_PRICE}"

PRINT 1,1`,
    variables: ["ITEM_NAME", "BARCODE", "NUMBER_ITEM_PRICE", "DECIMAL_ITEM_PRICE"],
    isActive: true,
    companyId: null, // Will be set for all companies if null
  },
  {
    name: "ZEBRA_BARCODE_100x50",
    legends: "Zebra Printer - 100x50mm Label",
    printerModel: "ZEBRA",
    labelWidth: 100,
    labelHeight: 50,
    configTxt: `^XA
^MMT
^PW832
^LL200
^LS0
^BY3,3,50^FT50,80^BCN,,Y,N
^FD{BARCODE}^FS
^FT50,150^A0N,28,28
^FD{ITEM_NAME}^FS
^FT50,200^A0N,20,20
^FDPrice: {NUMBER_ITEM_PRICE}^FS
^XZ`,
    variables: ["ITEM_NAME", "BARCODE", "NUMBER_ITEM_PRICE"],
    isActive: true,
    companyId: null,
  },
  {
    name: "BROTHER_SMALL_LABEL_62x29",
    legends: "Brother QL - 62x29mm Label",
    printerModel: "BROTHER",
    labelWidth: 62,
    labelHeight: 29,
    configTxt: `^XA
^FT10,20^A0N,20,20^FD{ITEM_NAME}^FS
^FT10,50^BQN,2,5
^FDQA,{BARCODE}^FS
^FT10,80^A0N,15,15^FD{NUMBER_ITEM_PRICE}^FS
^XZ`,
    variables: ["ITEM_NAME", "BARCODE", "NUMBER_ITEM_PRICE"],
    isActive: true,
    companyId: null,
  },
];

async function createSamplePrinterConfigs() {
  try {
    console.log("📌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    console.log("\n🖨️ Creating sample printer configurations...\n");

    const created = [];
    for (const config of SAMPLE_CONFIGS) {
      try {
        const newConfig = await PrinterConfiguration.create(config);
        console.log(`✅ Created: ${newConfig.legends} (${newConfig._id})`);
        created.push(newConfig);
      } catch (error) {
        console.error(`❌ Error creating ${config.legends}:`, error.message);
      }
    }

    console.log(`\n✨ Successfully created ${created.length} printer configurations`);
    console.log("\n📋 Sample Configurations Created:");
    created.forEach((config) => {
      console.log(`
ID: ${config._id}
Name: ${config.legends}
Model: ${config.printerModel}
Label Size: ${config.labelWidth}mm × ${config.labelHeight}mm
Variables: ${config.variables.join(", ")}
Status: ${config.isActive ? "🟢 Active" : "🔴 Inactive"}
      `);
    });

    console.log("\n✅ Done! Printer configurations are ready for use.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the function
createSamplePrinterConfigs();
