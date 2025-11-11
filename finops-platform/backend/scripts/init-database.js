const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing FinOps Platform Database...');

    // Create default user (Program Manager)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const userId = uuidv4();

    await db.runQuery(`
      INSERT OR IGNORE INTO users (user_id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, 'Admin User', 'admin@finops.com', hashedPassword, 'Program Manager']);

    // Create sample company
    const companyId = uuidv4();
    await db.runQuery(`
      INSERT OR IGNORE INTO companies (company_id, company_name, total_budget, financial_period, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [companyId, 'RPSG Ventures', 10000000, 'Monthly', userId]);

    // Create sample pods
    const aiPodId = uuidv4();
    const marketingPodId = uuidv4();

    await db.runQuery(`
      INSERT OR IGNORE INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [aiPodId, 'AI Innovation Pod', 'AI/ML projects and infrastructure', companyId, userId, 5000000]);

    await db.runQuery(`
      INSERT OR IGNORE INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [marketingPodId, 'Marketing Pod', 'Marketing campaigns and tools', companyId, userId, 3000000]);

    // Create budget categories for pods
    const categories = ['Cloud', 'SaaS', 'Staff Augmentation', 'Other'];
    for (const category of categories) {
      await db.runQuery(`
        INSERT OR IGNORE INTO budget_categories (category_id, pod_id, category_name, allocated_amount)
        VALUES (?, ?, ?, ?)
      `, [uuidv4(), aiPodId, category, category === 'Cloud' ? 2000000 : 1000000]);

      await db.runQuery(`
        INSERT OR IGNORE INTO budget_categories (category_id, pod_id, category_name, allocated_amount)
        VALUES (?, ?, ?, ?)
      `, [uuidv4(), marketingPodId, category, category === 'SaaS' ? 1500000 : 500000]);
    }

    // Create sample vendors
    const awsVendorId = uuidv4();
    const slackVendorId = uuidv4();

    await db.runQuery(`
      INSERT OR IGNORE INTO vendors (vendor_id, vendor_name, vendor_type, shared_status, payment_terms, default_due_days, poc_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [awsVendorId, 'AWS Cloud Services', 'Cloud', 'Shared', 'Net 30', 30, 'support@aws.in']);

    await db.runQuery(`
      INSERT OR IGNORE INTO vendors (vendor_id, vendor_name, vendor_type, shared_status, payment_terms, default_due_days, poc_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [slackVendorId, 'Slack Technologies', 'SaaS', 'Shared', 'Net 15', 15, 'billing@slack.com']);

    // Create vendor-pod allocations for shared vendors
    await db.runQuery(`
      INSERT OR IGNORE INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), awsVendorId, aiPodId, 60]);

    await db.runQuery(`
      INSERT OR IGNORE INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), awsVendorId, marketingPodId, 40]);

    await db.runQuery(`
      INSERT OR IGNORE INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), slackVendorId, aiPodId, 50]);

    await db.runQuery(`
      INSERT OR IGNORE INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), slackVendorId, marketingPodId, 50]);

    console.log('✅ Database initialized successfully!');
    console.log('👤 Default admin user created:');
    console.log('   Email: admin@finops.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('🏢 Sample company and pods created for testing');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;