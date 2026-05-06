/**
 * Seed Thermal Invoice Templates
 * 
 * Creates thermal receipt templates for supermarket POS systems
 * Supports English and Arabic versions
 * 
 * Usage:
 *   node server/seeders/seedThermalTemplates.js
 */

import InvoiceTemplate from '../Models/InvoiceTemplate.js';
import { THERMAL_INVOICE_TEMPLATE_EN, THERMAL_INVOICE_TEMPLATE_AR } from '../templates/thermalInvoiceTemplate.js';
import mongoose from 'mongoose';

export const seedThermalTemplates = async () => {
  try {
    console.log('\n🔥 ========== THERMAL TEMPLATE SEEDING ==========');
    
    // ✅ 1. Seed English Thermal Template
    const existingENTemplate = await InvoiceTemplate.findOne({
      templateName: THERMAL_INVOICE_TEMPLATE_EN.templateName
    });
    
    if (existingENTemplate) {
      console.log('✅ English thermal template already exists (Thermal_Receipt_EN)');
    } else {
      const enTemplate = new InvoiceTemplate(THERMAL_INVOICE_TEMPLATE_EN);
      await enTemplate.save();
      console.log('✅ Created English thermal template');
      console.log(`   Name: ${THERMAL_INVOICE_TEMPLATE_EN.templateName}`);
      console.log(`   Type: ${THERMAL_INVOICE_TEMPLATE_EN.templateType}`);
      console.log(`   Language: ${THERMAL_INVOICE_TEMPLATE_EN.language}`);
      console.log(`   Size: ${THERMAL_INVOICE_TEMPLATE_EN.customDesign.pageSize}`);
    }
    
    // ✅ 2. Seed Arabic Thermal Template
    const existingARTemplate = await InvoiceTemplate.findOne({
      templateName: THERMAL_INVOICE_TEMPLATE_AR.templateName
    });
    
    if (existingARTemplate) {
      console.log('✅ Arabic thermal template already exists (Thermal_Receipt_AR)');
    } else {
      const arTemplate = new InvoiceTemplate(THERMAL_INVOICE_TEMPLATE_AR);
      await arTemplate.save();
      console.log('✅ Created Arabic thermal template');
      console.log(`   Name: ${THERMAL_INVOICE_TEMPLATE_AR.templateName}`);
      console.log(`   Type: ${THERMAL_INVOICE_TEMPLATE_AR.templateType}`);
      console.log(`   Language: ${THERMAL_INVOICE_TEMPLATE_AR.language}`);
      console.log(`   Size: ${THERMAL_INVOICE_TEMPLATE_AR.customDesign.pageSize}`);
    }
    
    // ✅ 3. Verify seeding
    const allThermalTemplates = await InvoiceTemplate.find({
      templateName: { $in: ['Thermal_Receipt_EN', 'Thermal_Receipt_AR'] }
    });
    
    console.log(`\n📊 Thermal Templates Summary:`);
    console.log(`   Total thermal templates: ${allThermalTemplates.length}`);
    console.log(`   English version: ${allThermalTemplates.some(t => t.language === 'EN') ? '✅' : '❌'}`);
    console.log(`   Arabic version: ${allThermalTemplates.some(t => t.language === 'AR') ? '✅' : '❌'}`);
    
    console.log('\n🎉 Thermal template seeding complete!\n');
    
    return {
      success: true,
      enTemplate: existingENTemplate || THERMAL_INVOICE_TEMPLATE_EN.templateName,
      arTemplate: existingARTemplate || THERMAL_INVOICE_TEMPLATE_AR.templateName
    };
    
  } catch (error) {
    console.error('❌ Error seeding thermal templates:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
};

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await seedThermalTemplates();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

export default seedThermalTemplates;
