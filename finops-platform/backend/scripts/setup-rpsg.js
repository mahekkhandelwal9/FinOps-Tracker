const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function setupRPSG() {
  try {
    console.log('🏢 Setting up RPSG Company Structure...');

    // Create default user if not exists
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const userId = uuidv4();

    await db.runQuery(`
      INSERT OR IGNORE INTO users (user_id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, 'Admin User', 'admin@finops.com', hashedPassword, 'Program Manager']);

    // Create RPSG company if not exists
    const companyId = uuidv4();
    await db.runQuery(`
      INSERT OR IGNORE INTO companies (company_id, company_name, total_budget, financial_period, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [companyId, 'RPSG Ventures', 0, 'Monthly', userId]);

    // Create basic RPSG pods if not exists
    const aiPodId = uuidv4();
    const marketingPodId = uuidv4();

    await db.runQuery(`
      INSERT OR IGNORE INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [aiPodId, 'AI Innovation Pod', 'AI/ML projects and innovation', companyId, userId, 0]);

    await db.runQuery(`
      INSERT OR IGNORE INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [marketingPodId, 'Marketing Pod', 'Marketing campaigns and brand management', companyId, userId, 0]);

    console.log('✅ RPSG Company Structure Ready!');
    console.log('');
    console.log('📊 What has been created:');

    // Check what we have
    const companyCount = await db.runQuery('SELECT COUNT(*) as count FROM companies WHERE company_name LIKE "%RPSG%"');
    const podCount = await db.runQuery('SELECT COUNT(*) as count FROM pods WHERE company_id IN (SELECT company_id FROM companies WHERE company_name LIKE "%RPSG%")');
    const userCount = await db.runQuery('SELECT COUNT(*) as count FROM users');

    console.log(`   🏢 RPSG Companies: ${companyCount[0].count}`);
    console.log(`   🚀 RPSG Pods: ${podCount[0].count}`);
    console.log(`   👥 Users: ${userCount[0].count}`);
    console.log('');
    console.log('🎯 RPSG structure is ready for realistic data upload!');
    console.log('');
    console.log('👤 Login credentials:');
    console.log('   Email: admin@finops.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error setting up RPSG:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  setupRPSG();
}

module.exports = setupRPSG;