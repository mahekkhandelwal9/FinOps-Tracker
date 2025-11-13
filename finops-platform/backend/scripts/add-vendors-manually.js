const db = require('../config/database');

async function addVendorsManually() {
  try {
    console.log('🏢 Adding Vendors Manually...');

    // Use simple direct database calls
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
      }
    ];

    // Clean existing vendors first
    await db.runQuery('DELETE FROM vendors');
    await db.runQuery('DELETE FROM vendor_pod_allocations');

    let createdCount = 0;

    for (const vendor of vendors) {
      try {
        // Generate a simple UUID-like ID
        const vendorId = 'vendor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        await db.runQuery(`
          INSERT INTO vendors (
            vendor_id, vendor_name, vendor_type, shared_status, payment_terms,
            default_due_days, poc_email, poc_phone, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          vendorId, vendor.name, vendor.type, 'Exclusive', vendor.payment_terms,
          vendor.due_days, vendor.email, vendor.phone, 'Active', vendor.notes
        ]);

        console.log(`✅ Created: ${vendor.name} (${vendorId})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Failed to create ${vendor.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Created ${createdCount} vendors successfully!`);
    console.log('\n💡 You can now:');
    console.log('1. View vendors in the Vendors page');
    console.log('2. Edit each vendor to assign them to specific pods');
    console.log('3. Create invoices linked to vendors in the Invoices page');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

addVendorsManually();