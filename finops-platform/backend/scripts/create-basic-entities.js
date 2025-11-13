const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function createBasicEntities() {
  try {
    console.log('🔧 Creating Basic Entities...');

    // Get existing users and company
    const users = await db.query('SELECT user_id FROM users LIMIT 1');
    const userId = users[0]?.user_id;

    const companies = await db.query('SELECT company_id FROM companies WHERE company_name LIKE "%RPSG%"');
    const companyId = companies[0]?.company_id;

    if (!userId || !companyId) {
      throw new Error('Required user or company not found');
    }

    console.log(`Using Company: ${companyId}, User: ${userId}`);

    // Clean existing data first
    await db.runQuery('DELETE FROM vendors');
    await db.runQuery('DELETE FROM vendor_pod_allocations');

    // Create basic vendors with realistic data
    const vendors = [
      {
        name: 'AWS Cloud Services',
        type: 'Cloud',
        email: 'billing@aws.amazon.com',
        phone: '+1-800-555-1234',
        payment_terms: 'NET 30',
        due_days: 30,
        notes: 'Primary cloud infrastructure provider'
      },
      {
        name: 'Microsoft Azure',
        type: 'Cloud',
        email: 'billing@azure.microsoft.com',
        phone: '+1-800-555-5678',
        payment_terms: 'NET 30',
        due_days: 30,
        notes: 'Secondary cloud services provider'
      },
      {
        name: 'Google Workspace',
        type: 'SaaS',
        email: 'billing@workspace.google.com',
        phone: '+1-800-555-9876',
        payment_terms: 'NET 15',
        due_days: 15,
        notes: 'Office productivity suite'
      },
      {
        name: 'Salesforce',
        type: 'SaaS',
        email: 'billing@salesforce.com',
        phone: '+1-800-555-4321',
        payment_terms: 'NET 30',
        due_days: 30,
        notes: 'CRM and sales automation platform'
      },
      {
        name: 'TCS Consulting',
        type: 'Staff Augmentation',
        email: 'billing@tcs.com',
        phone: '+91-22-5555-1234',
        payment_terms: 'NET 45',
        due_days: 45,
        notes: 'IT consulting and staff augmentation services'
      },
      {
        name: 'Infosys Technologies',
        type: 'Staff Augmentation',
        email: 'billing@infosys.com',
        phone: '+91-80-5555-6789',
        payment_terms: 'NET 60',
        due_days: 60,
        notes: 'Enterprise software development services'
      },
      {
        name: 'Oracle Cloud',
        type: 'Cloud',
        email: 'billing@oracle.com',
        phone: '+1-800-555-2435',
        payment_terms: 'NET 30',
        due_days: 30,
        notes: 'Database and cloud infrastructure'
      },
      {
        name: 'GitHub',
        type: 'SaaS',
        email: 'billing@github.com',
        phone: '+1-800-555-8765',
        payment_terms: 'Annual',
        due_days: 365,
        notes: 'Code repository and collaboration platform'
      }
    ];

    const createdVendors = [];

    for (const vendor of vendors) {
      const vendorId = uuidv4();

      await db.runQuery(`
        INSERT INTO vendors (
          vendor_id, vendor_name, vendor_type, shared_status, payment_terms,
          default_due_days, poc_email, poc_phone, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId, vendor.name, vendor.type, 'Exclusive', vendor.payment_terms,
        vendor.due_days, vendor.email, vendor.phone, 'Active', vendor.notes
      ]);

      createdVendors.push({
        id: vendorId,
        name: vendor.name,
        type: vendor.type
      });
    }

    console.log(`✅ Created ${createdVendors.length} vendors`);

    // Get existing pods
    const pods = await db.query('SELECT pod_id, pod_name FROM pods WHERE company_id = ?', [companyId]);

      // Create vendor-pod allocations (distribute vendors across pods)
    let vendorIndex = 0;
    for (const pod of pods) {
      // Assign 2-3 vendors to each pod
      const vendorsForPod = createdVendors.slice(vendorIndex, vendorIndex + 3);

      for (const vendor of vendorsForPod) {
        const allocationId = uuidv4();
        try {
          await db.runQuery(`
            INSERT INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
            VALUES (?, ?, ?, ?)
          `, [allocationId, vendor.id, pod.pod_id, 100]);
          console.log(`   ✅ Allocated ${vendor.name} to ${pod.pod_name}`);
        } catch (allocError) {
          console.error(`   ❌ Failed to allocate ${vendor.name} to ${pod.pod_name}:`, allocError.message);
        }
      }

      vendorIndex += vendorsForPod.length;
    }

    console.log('✅ Created vendor-pod allocations');
    console.log('\n🎉 Basic entities created successfully!');
    console.log(`   👥 Companies: 1 (RPSG)`);
    console.log(`   🚀 Pods: ${pods.length}`);
    console.log(`   🏢 Vendors: ${createdVendors.length}`);
    console.log(`   📋 Invoices: 0 (ready for manual creation)`);

  } catch (error) {
    console.error('❌ Error creating basic entities:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  createBasicEntities();
}

module.exports = createBasicEntities;