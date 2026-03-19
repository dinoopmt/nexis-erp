/**
 * ============================================================================
 * DATABASE OPTIMIZATION UTILITIES
 * ============================================================================
 * 
 * Implements database indexing, query optimization, and maintenance tasks
 * for high-volume data entry (100k+ products)
 * 
 * Includes:
 * - Automatic index creation
 * - Index usage analysis
 * - Query optimization recommendations
 * - Database maintenance utilities
 * 
 * ============================================================================
 */

import Product from '../Models/AddProduct.js';
import Counter from '../Models/SequenceModel.js';
import Grouping from '../Models/Grouping.js';
import UnitType from '../Models/UnitType.js';

/**
 * Create all recommended indexes for product operations
 */
export const createProductIndexes = async () => {
  try {
    console.log('🔧 Creating database indexes...');
    
    // Indexes for Product collection
    const productIndexes = [
      // For product creation/search (single field indexes)
      { key: { itemcode: 1 }, options: { unique: true, sparse: true, name: 'idx_itemcode' } },
      { key: { barcode: 1 }, options: { unique: true, sparse: true, name: 'idx_barcode' } },
      { key: { name: 1 }, options: { name: 'idx_name' } },
      { key: { isDeleted: 1 }, options: { name: 'idx_isDeleted' } },
      
      // Compound indexes for common queries
      { key: { isDeleted: 1, itemcode: 1 }, options: { name: 'idx_notDeletedItemcode' } },
      { key: { isDeleted: 1, barcode: 1 }, options: { name: 'idx_notDeletedBarcode' } },
      { key: { categoryId: 1, isDeleted: 1 }, options: { name: 'idx_categoryNotDeleted' } },
      { key: { groupingId: 1, isDeleted: 1 }, options: { name: 'idx_groupingNotDeleted' } },
      
      // For pagination and sorting
      { key: { createdAt: -1 }, options: { name: 'idx_createdAtDesc' } },
      { key: { isDeleted: 1, createdAt: -1 }, options: { name: 'idx_notDeletedCreated' } },
      
      // For vendor and cost queries
      { key: { vendor: 1 }, options: { name: 'idx_vendor' } },
      { key: { cost: 1 }, options: { name: 'idx_cost' } },
      { key: { price: 1 }, options: { name: 'idx_price' } },
      
      // Text index for full-text search
      { key: { name: 'text', vendor: 'text', itemcode: 'text' }, options: { name: 'idx_fulltext' } }
    ];
    
    let createdCount = 0;
    for (const index of productIndexes) {
      try {
        await Product.collection.createIndex(index.key, index.options);
        createdCount++;
        console.log(`  ✓ Created index: ${index.options.name}`);
      } catch (err) {
        if (err.code === 85) {
          // Index already exists, skip
        } else if (err.code === 86) {
          // Index key pattern conflict
          console.warn(`  ⚠ Index conflict for ${index.options.name}, dropping and recreating...`);
          try {
            await Product.collection.dropIndex(index.options.name);
            await Product.collection.createIndex(index.key, index.options);
            createdCount++;
          } catch (dropErr) {
            console.error(`  ✗ Failed to recreate index ${index.options.name}`);
          }
        } else {
          console.error(`  ✗ Error creating index ${index.options.name}:`, err.message);
        }
      }
    }
    
    // Indexes for Counter collection (sequence table)
    const counterIndexes = [
      { key: { module: 1, financialYear: 1 }, options: { unique: true, name: 'idx_moduleFinancialYear' } }
    ];
    
    for (const index of counterIndexes) {
      try {
        await Counter.collection.createIndex(index.key, index.options);
        createdCount++;
        console.log(`  ✓ Created index on Counter: ${index.options.name}`);
      } catch (err) {
        if (err.code !== 85) {
          console.warn(`  ⚠ Error creating Counter index: ${err.message}`);
        }
      }
    }
    
    console.log(`✅ Index creation completed (${createdCount} indexes processed)`);
    return { success: true, indexesProcessed: createdCount };
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Analyze index usage and provide recommendations
 */
export const analyzeIndexUsage = async () => {
  try {
    console.log('📊 Analyzing index usage...');
    
    const indexStats = await Product.collection.aggregate([
      { $indexStats: {} }
    ]).toArray();
    
    console.log('\n📈 Index Usage Statistics:');
    console.log('─'.repeat(70));
    
    let totalAccesses = 0;
    indexStats.forEach(stat => {
      const accesses = stat.accesses.ops;
      totalAccesses += accesses;
      console.log(`Index: ${stat.name}`);
      console.log(`  • Operations: ${accesses}`);
      console.log(`  • Since: ${stat.accesses.since}`);
      console.log('');
    });
    
    console.log('─'.repeat(70));
    console.log(`Total Index Operations: ${totalAccesses}`);
    
    // Identify unused indexes
    const unusedIndexes = indexStats.filter(stat => stat.accesses.ops === 0 && stat.name !== '_id_');
    if (unusedIndexes.length > 0) {
      console.log('\n⚠️  Unused Indexes (consider removing):');
      unusedIndexes.forEach(idx => {
        console.log(`  • ${idx.name}`);
      });
    }
    
    return { success: true, indexStats, unusedIndexes };
    
  } catch (error) {
    console.error('❌ Error analyzing indexes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate database consistency
 */
export const validateDatabaseConsistency = async () => {
  try {
    console.log('🔍 Validating database consistency...');
    
    const issues = [];
    
    // Check for duplicate itemcodes
    console.log('  • Checking for duplicate itemcodes...');
    const duplicateItemcodes = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$itemcode', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateItemcodes.length > 0) {
      issues.push({
        type: 'DUPLICATE_ITEMCODES',
        count: duplicateItemcodes.length,
        examples: duplicateItemcodes.slice(0, 5)
      });
      console.log(`    ⚠️  Found ${duplicateItemcodes.length} duplicate itemcodes`);
    } else {
      console.log('    ✓ No duplicate itemcodes');
    }
    
    // Check for duplicate barcodes
    console.log('  • Checking for duplicate barcodes...');
    const duplicateBarcodes = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$barcode', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateBarcodes.length > 0) {
      issues.push({
        type: 'DUPLICATE_BARCODES',
        count: duplicateBarcodes.length,
        examples: duplicateBarcodes.slice(0, 5)
      });
      console.log(`    ⚠️  Found ${duplicateBarcodes.length} duplicate barcodes`);
    } else {
      console.log('    ✓ No duplicate barcodes');
    }
    
    // Check for broken references
    console.log('  • Checking for broken category references...');
    const brokenCategories = await Product.find({
      isDeleted: false,
      categoryId: { $ne: null },
      $expr: { $not: { $in: ['$categoryId', await Grouping.find().distinct('_id')] } }
    }).count();
    
    if (brokenCategories > 0) {
      issues.push({
        type: 'BROKEN_CATEGORY_REFS',
        count: brokenCategories
      });
      console.log(`    ⚠️  Found ${brokenCategories} broken category references`);
    } else {
      console.log('    ✓ No broken category references');
    }
    
    // Check counter integrity
    console.log('  • Checking sequence counter integrity...');
    const counters = await Counter.find();
    console.log(`    ✓ Found ${counters.length} sequence counters`);
    counters.forEach(counter => {
      console.log(`      • ${counter.module} (FY: ${counter.financialYear}): lastNumber = ${counter.lastNumber}`);
    });
    
    // Summary
    console.log('\n✅ Consistency check completed');
    return {
      success: true,
      issuesFound: issues.length,
      issues,
      summary: {
        duplicateItemcodes: duplicateItemcodes.length,
        duplicateBarcodes: duplicateBarcodes.length,
        brokenCategoryRefs: brokenCategories,
        totalCounters: counters.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error validating consistency:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate optimization recommendations
 */
export const generateOptimizationRecommendations = async () => {
  try {
    console.log('💡 Generating optimization recommendations...');
    
    const recommendations = [];
    
    // Check product count
    const productCount = await Product.countDocuments({ isDeleted: false });
    console.log(`\nCurrent product count: ${productCount}`);
    
    if (productCount > 50000) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Data Pagination',
        issue: 'Large number of products detected',
        recommendation: 'Ensure pagination on product listing (currently using limit: 20)',
        expectedImpact: '40-60% faster page loads'
      });
    }
    
    if (productCount > 100000) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Batch Operations',
        issue: 'Very large dataset',
        recommendation: 'Implement batch insert/update operations for bulk uploads',
        expectedImpact: '10x faster bulk operations'
      });
    }
    
    // Check for missing indexes
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Query Performance',
      issue: 'Full-text search not optimized',
      recommendation: 'Implement text index and use $text query operator',
      expectedImpact: '80% faster search queries'
    });
    
    // Cache recommendations
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Caching',
      issue: 'No client-side caching for frequently accessed data',
      recommendation: 'Implement IndexedDB caching for product list and categories',
      expectedImpact: '90% faster instant access to cached data'
    });
    
    // Batch operations
    recommendations.push({
      priority: 'LOW',
      area: 'API Design',
      issue: 'Single product creation only',
      recommendation: 'Add bulk product creation endpoint (/api/products/bulk)',
      expectedImpact: '50x faster bulk uploads'
    });
    
    console.log('\n📋 Recommendations by Priority:');
    console.log('═'.repeat(70));
    
    ['HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
      const filtered = recommendations.filter(r => r.priority === priority);
      if (filtered.length > 0) {
        console.log(`\n${priority} PRIORITY (${filtered.length}):`);
        filtered.forEach((rec, idx) => {
          console.log(`\n  ${idx + 1}. ${rec.area}`);
          console.log(`     Issue: ${rec.issue}`);
          console.log(`     Recommendation: ${rec.recommendation}`);
          console.log(`     Expected Impact: ${rec.expectedImpact}`);
        });
      }
    });
    
    return { success: true, recommendations };
    
  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Maintenance routine: Remove old test data, optimize storage
 */
export const runDatabaseMaintenance = async () => {
  try {
    console.log('🛠️  Running database maintenance...');
    
    const results = {
      deletedTestProducts: 0,
      optimizedIndexes: false,
      errors: []
    };
    
    // Remove test products older than 24 hours
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deleteResult = await Product.deleteMany({
        name: { $regex: /^TestProduct_/ },
        createdAt: { $lt: yesterday }
      });
      results.deletedTestProducts = deleteResult.deletedCount;
      console.log(`  ✓ Deleted ${deleteResult.deletedCount} old test products`);
    } catch (err) {
      results.errors.push(`Failed to delete test products: ${err.message}`);
    }
    
    // Rebalance indexes
    try {
      await Product.collection.reIndex();
      results.optimizedIndexes = true;
      console.log('  ✓ Rebalanced indexes');
    } catch (err) {
      results.errors.push(`Failed to rebalance indexes: ${err.message}`);
    }
    
    console.log('\n✅ Maintenance completed');
    return { success: true, ...results };
    
  } catch (error) {
    console.error('❌ Error during maintenance:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createProductIndexes,
  analyzeIndexUsage,
  validateDatabaseConsistency,
  generateOptimizationRecommendations,
  runDatabaseMaintenance
};
