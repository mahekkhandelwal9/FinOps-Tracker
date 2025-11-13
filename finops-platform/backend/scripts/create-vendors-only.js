const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function createVendorsOnly() {
  try {
    console.log('🏢 Creating Vendors Only...');

    // Clean existing data first
    await db.runQuery('DELETE FROM vendor_pod_allocations');
    await db.runQuery('DELETE FROM vendors');

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

      console.log(`✅ Created vendor: ${vendor.name}`);
    }

    console.log(`\n🎉 Created ${createdVendors.length} vendors successfully!`);
    console.log('\n💡 Next steps:');
    console.log('1. Go to Vendors page to see the created vendors');
    console.log('2. Edit each vendor to assign them to specific pods');
    console.log('3. Use Invoices page to create invoices connected to vendors');

  } catch (error) {
    console.error('❌ Error creating vendors:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  createVendorsOnly();
}

module.exports = createVendorsOnly;