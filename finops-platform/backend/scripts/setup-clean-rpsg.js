const db = require('../config/database');

async function setupCleanRPSG() {
  try {
    console.log('🏢 Setting up Clean RPSG Structure...');

    // Clean all data first
    await db.runQuery('DELETE FROM company_notes');
    await db.runQuery('DELETE FROM payments');
    await db.runQuery('DELETE FROM invoices');
    await db.runQuery('DELETE FROM budget_categories');
    await db.runQuery('DELETE FROM vendor_pod_allocations');
    await db.runQuery('DELETE FROM vendors');
    await db.runQuery('DELETE FROM alerts');
    await db.runQuery('DELETE FROM pods');
    await db.runQuery('DELETE FROM companies');

    console.log('✅ All existing data cleared');

    // Create basic RPSG structure with no calculations
    const companyId = 'rpsg-company-001';
    const aiPodId = 'rpsg-pod-ai-001';
    const mbsgPodId = 'rpsg-pod-mbsg-001';
    const tgsPodId = 'rpsg-pod-tgs-001';
    const userId = 'rpsg-user-001';

    // Create user first
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await db.runQuery(`
      INSERT OR IGNORE INTO users (user_id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, 'RPSG Admin', 'admin@rpsg.com', hashedPassword, 'Program Manager']);

    console.log('✅ User created');

    // Create RPSG company
    await db.runQuery(`
      INSERT INTO companies (company_id, company_name, total_budget, financial_period, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [companyId, 'RPSG Ventures', 0, 'Monthly', userId, 'Active']);

    console.log('✅ Company created');

    // Create RPSG pods with zero budgets
    await db.runQuery(`
      INSERT INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling, budget_used, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [aiPodId, 'AI Innovation Pod', 'AI/ML projects and innovation', companyId, userId, 0, 0, 'Active']);

    await db.runQuery(`
      INSERT INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling, budget_used, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [mbsgPodId, 'MBSG Pod', 'Media Business Strategic Group', companyId, userId, 0, 0, 'Active']);

    await db.runQuery(`
      INSERT INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling, budget_used, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [tgsPodId, 'TGS Pod', 'Technology and Global Services', companyId, userId, 0, 0, 'Active']);

    
    console.log('✅ Clean RPSG Structure Created!');
    console.log('');
    console.log('📊 Structure Summary:');
    console.log('   🏢 Company: RPSG Ventures (₹0 budget)');
    console.log('   🚀 Pods: 3 pods (all with ₹0 budgets)');
    console.log('      • AI Innovation Pod');
    console.log('      • MBSG Pod');
    console.log('      • TGS Pod');
    console.log('   👥 Users: 1 admin user');
    console.log('   💰 No vendors, invoices, or payments');
    console.log('');
    console.log('🎯 Ready for realistic data upload!');
    console.log('');
    console.log('👤 Login credentials:');
    console.log('   Email: admin@rpsg.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error setting up clean RPSG:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  setupCleanRPSG();
}

module.exports = setupCleanRPSG;