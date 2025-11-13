const db = require('../config/database');

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning FinOps Platform Database...');

    // Delete all data while preserving structure (in correct order to respect foreign keys)
    console.log('📝 Removing all company_notes...');
    try {
      await db.runQuery('DELETE FROM company_notes');
    } catch (e) {
      console.log('   (company_notes table not found or already empty)');
    }

    console.log('💳 Removing all payments...');
    try {
      await db.runQuery('DELETE FROM payments');
    } catch (e) {
      console.log('   (payments table not found or already empty)');
    }

    console.log('📋 Removing all invoices...');
    try {
      await db.runQuery('DELETE FROM invoices');
    } catch (e) {
      console.log('   (invoices table not found or already empty)');
    }

    console.log('📊 Removing all budget_categories...');
    try {
      await db.runQuery('DELETE FROM budget_categories');
    } catch (e) {
      console.log('   (budget_categories table not found or already empty)');
    }

    console.log('🏢 Removing all vendor-pod allocations...');
    try {
      await db.runQuery('DELETE FROM vendor_pod_allocations');
    } catch (e) {
      console.log('   (vendor_pod_allocations table not found or already empty)');
    }

    console.log('👥 Removing all vendors...');
    try {
      await db.runQuery('DELETE FROM vendors');
    } catch (e) {
      console.log('   (vendors table not found or already empty)');
    }

    console.log('📋 Removing all alerts...');
    try {
      await db.runQuery('DELETE FROM alerts');
    } catch (e) {
      console.log('   (alerts table not found or already empty)');
    }

    console.log('🚀 Removing all pods except RPSG pods...');
    try {
      await db.runQuery(`
        DELETE FROM pods
        WHERE company_id NOT IN (
          SELECT company_id FROM companies WHERE company_name LIKE '%RPSG%'
        )
      `);
    } catch (e) {
      console.log('   (pods table not found or already empty)');
    }

    console.log('🏢 Removing all companies except RPSG...');
    try {
      await db.runQuery('DELETE FROM companies WHERE company_name NOT LIKE "%RPSG%"');
    } catch (e) {
      console.log('   (companies table not found or already empty)');
    }

    console.log('🔄 Resetting RPSG pods to clean state...');
    try {
      await db.runQuery(`
        UPDATE pods
        SET budget_ceiling = 0,
            budget_used = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id IN (
          SELECT company_id FROM companies WHERE company_name LIKE '%RPSG%'
        )
      `);
    } catch (e) {
      console.log('   (pods update failed)');
    }

    console.log('🏢 Resetting RPSG company to clean state...');
    try {
      await db.runQuery(`
        UPDATE companies
        SET total_budget = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_name LIKE '%RPSG%'
      `);
    } catch (e) {
      console.log('   (companies update failed)');
    }

    console.log('✅ Database cleaned successfully!');
    console.log('');
    console.log('📊 What remains:');

    // Check what remains
    try {
      const companyCount = await db.runQuery('SELECT COUNT(*) as count FROM companies WHERE company_name LIKE "%RPSG%"');
      const podCount = await db.runQuery('SELECT COUNT(*) as count FROM pods WHERE company_id IN (SELECT company_id FROM companies WHERE company_name LIKE "%RPSG%")');
      const userCount = await db.runQuery('SELECT COUNT(*) as count FROM users');

      console.log(`   🏢 RPSG Companies: ${companyCount[0].count}`);
      console.log(`   🚀 RPSG Pods: ${podCount[0].count}`);
      console.log(`   👥 Users: ${userCount[0].count}`);
    } catch (e) {
      console.log('   (Error checking remaining data)');
    }
    console.log('');
    console.log('🎯 Ready for new realistic data!');

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  cleanDatabase();
}

module.exports = cleanDatabase;