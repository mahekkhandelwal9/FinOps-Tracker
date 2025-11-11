const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database path
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

async function insertRealisticData() {
  console.log('🚀 Adding realistic sample data to FinOps Platform...');

  try {
    // Enable foreign keys
    await new Promise((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get the admin user ID
    const adminUser = await new Promise((resolve, reject) => {
      db.get('SELECT user_id FROM users WHERE email = ?', ['admin@finops.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please run npm run init-db first.');
    }

    const adminUserId = adminUser.user_id;

    // Insert realistic companies with budgets
    const companies = [
      {
        id: uuidv4(),
        name: 'TechCorp India',
        total_budget: 50000000,
        currency: 'INR',
        financial_period: 'Yearly',
        notes: 'Leading technology solutions provider'
      },
      {
        id: uuidv4(),
        name: 'Digital Solutions Ltd',
        total_budget: 30000000,
        currency: 'INR',
        financial_period: 'Yearly',
        notes: 'Digital transformation services'
      },
      {
        id: uuidv4(),
        name: 'CloudTech Systems',
        total_budget: 40000000,
        currency: 'INR',
        financial_period: 'Yearly',
        notes: 'Cloud infrastructure and services'
      }
    ];

    for (const company of companies) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO companies (company_id, company_name, total_budget, currency, financial_period, notes, created_by, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [company.id, company.name, company.total_budget, company.currency, company.financial_period, company.notes, adminUserId, 'Active'],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Insert realistic pods
    const pods = [
      {
        id: uuidv4(),
        company_id: companies[0].id,
        name: 'E-Commerce Platform',
        budget_ceiling: 15000000,
        description: 'Online retail platform development'
      },
      {
        id: uuidv4(),
        company_id: companies[0].id,
        name: 'Mobile Banking App',
        budget_ceiling: 20000000,
        description: 'Banking application for mobile devices'
      },
      {
        id: uuidv4(),
        company_id: companies[1].id,
        name: 'AI/ML Research',
        budget_ceiling: 12000000,
        description: 'Machine learning research initiatives'
      },
      {
        id: uuidv4(),
        company_id: companies[2].id,
        name: 'Cloud Migration',
        budget_ceiling: 18000000,
        description: 'Enterprise cloud migration project'
      }
    ];

    for (const pod of pods) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO pods (pod_id, pod_name, description, company_id, owner_user_id, budget_ceiling, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [pod.id, pod.name, pod.description, pod.company_id, adminUserId, pod.budget_ceiling, 'Active'],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Insert realistic vendors
    const vendors = [
      {
        id: uuidv4(),
        name: 'AWS India',
        type: 'Cloud',
        shared_status: 'Shared',
        poc_email: 'support@aws.in',
        poc_phone: '+91-80-12345678',
        payment_terms: 'NET 30',
        default_due_days: 30,
        notes: 'Primary cloud services provider'
      },
      {
        id: uuidv4(),
        name: 'Microsoft Azure',
        type: 'Cloud',
        shared_status: 'Shared',
        poc_email: 'support@microsoft.in',
        poc_phone: '+91-80-87654321',
        payment_terms: 'NET 30',
        default_due_days: 30,
        notes: 'Enterprise cloud services'
      },
      {
        id: uuidv4(),
        name: 'TCS Cloud Services',
        type: 'Staff Augmentation',
        shared_status: 'Exclusive',
        poc_email: 'cloud@tcs.com',
        poc_phone: '+91-22-98765432',
        payment_terms: 'NET 45',
        default_due_days: 45,
        notes: 'Dedicated development team'
      },
      {
        id: uuidv4(),
        name: 'Infosys Digital',
        type: 'SaaS',
        shared_status: 'Shared',
        poc_email: 'digital@infosys.com',
        poc_phone: '+91-80-11223344',
        payment_terms: 'NET 60',
        default_due_days: 60,
        notes: 'Software licensing solutions'
      },
      {
        id: uuidv4(),
        name: 'Wipro Infrastructure',
        type: 'Staff Augmentation',
        shared_status: 'Exclusive',
        poc_email: 'infra@wipro.com',
        poc_phone: '+91-80-55667788',
        payment_terms: 'NET 30',
        default_due_days: 30,
        notes: 'Infrastructure management services'
      }
    ];

    for (const vendor of vendors) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO vendors (vendor_id, vendor_name, vendor_type, shared_status, poc_email, poc_phone, payment_terms, default_due_days, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [vendor.id, vendor.name, vendor.type, vendor.shared_status, vendor.poc_email, vendor.poc_phone, vendor.payment_terms, vendor.default_due_days, vendor.notes, 'Active'],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Insert vendor-pod allocations for shared vendors
    const vendorPodAllocations = [
      { vendor_id: vendors[0].id, pod_id: pods[0].id, percentage: 60 },
      { vendor_id: vendors[0].id, pod_id: pods[1].id, percentage: 40 },
      { vendor_id: vendors[1].id, pod_id: pods[2].id, percentage: 70 },
      { vendor_id: vendors[1].id, pod_id: pods[3].id, percentage: 30 },
      { vendor_id: vendors[3].id, pod_id: pods[0].id, percentage: 100 },
    ];

    for (const allocation of vendorPodAllocations) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
          VALUES (?, ?, ?, ?)
        `, [uuidv4(), allocation.vendor_id, allocation.pod_id, allocation.percentage],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Insert realistic invoices
    const invoices = [
      {
        id: uuidv4(),
        vendor_id: vendors[0].id,
        pod_id: pods[0].id,
        title: 'AWS Cloud Services - January 2024',
        invoice_month: '2024-01',
        amount: 1250000,
        invoice_date: '2024-01-31',
        due_date: '2024-03-01',
        status: 'Paid',
        notes: 'EC2 instances, S3 storage, and data transfer charges'
      },
      {
        id: uuidv4(),
        vendor_id: vendors[1].id,
        pod_id: pods[1].id,
        title: 'Azure Cloud Services - January 2024',
        invoice_month: '2024-01',
        amount: 890000,
        invoice_date: '2024-01-30',
        due_date: '2024-02-29',
        status: 'Paid',
        notes: 'VM instances and Azure DevOps services'
      },
      {
        id: uuidv4(),
        vendor_id: vendors[2].id,
        pod_id: pods[0].id,
        title: 'TCS Development Services - January 2024',
        invoice_month: '2024-01',
        amount: 2500000,
        invoice_date: '2024-02-01',
        due_date: '2024-03-17',
        status: 'Pending',
        notes: 'Development team support and consulting'
      },
      {
        id: uuidv4(),
        vendor_id: vendors[3].id,
        pod_id: pods[2].id,
        title: 'SaaS Licenses - Q1 2024',
        invoice_month: '2024-01',
        amount: 450000,
        invoice_date: '2024-02-01',
        due_date: '2024-04-01',
        status: 'Overdue',
        notes: 'Annual software license renewal'
      },
      {
        id: uuidv4(),
        vendor_id: vendors[4].id,
        pod_id: pods[3].id,
        title: 'Infrastructure Management - February 2024',
        invoice_month: '2024-02',
        amount: 1750000,
        invoice_date: '2024-03-01',
        due_date: '2024-03-31',
        status: 'Pending',
        notes: 'Cloud infrastructure monitoring and support'
      }
    ];

    for (const invoice of invoices) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO invoices (invoice_id, invoice_title, vendor_id, pod_id, invoice_month, amount, invoice_date, due_date, status, notes, added_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [invoice.id, invoice.title, invoice.vendor_id, invoice.pod_id, invoice.invoice_month, invoice.amount, invoice.invoice_date, invoice.due_date, invoice.status, invoice.notes, adminUserId],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Insert payments for paid invoices
    const payments = [
      {
        id: uuidv4(),
        invoice_id: invoices[0].id,
        vendor_id: invoices[0].vendor_id,
        pod_id: invoices[0].pod_id,
        payment_date: '2024-02-25',
        payment_amount: 1250000,
        payment_method: 'Bank Transfer',
        reference_number: 'TXN123456789',
        remarks: 'Payment processed via corporate banking'
      },
      {
        id: uuidv4(),
        invoice_id: invoices[1].id,
        vendor_id: invoices[1].vendor_id,
        pod_id: invoices[1].pod_id,
        payment_date: '2024-02-20',
        payment_amount: 890000,
        payment_method: 'Bank Transfer',
        reference_number: 'TXN987654321',
        remarks: 'Azure services payment for January'
      }
    ];

    for (const payment of payments) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO payments (payment_id, invoice_id, vendor_id, pod_id, payment_date, payment_amount, payment_method, reference_number, recorded_by, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [payment.id, payment.invoice_id, payment.vendor_id, payment.pod_id, payment.payment_date, payment.payment_amount, payment.payment_method, payment.reference_number, adminUserId, payment.remarks],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Insert alerts
    const alerts = [
      {
        id: uuidv4(),
        type: 'Invoice Overdue',
        related_invoice_id: invoices[3].id,
        related_pod_id: pods[2].id,
        message: 'Invoice INF-2024-007 (SaaS Licenses - Q1 2024) is overdue for payment. Amount: ₹450,000',
        severity: 'High',
        due_date: '2024-04-01',
        trigger_date: new Date().toISOString(),
        sent_to: adminUserId
      },
      {
        id: uuidv4(),
        type: 'Budget Threshold',
        related_pod_id: pods[0].id,
        message: 'E-Commerce Platform has utilized 75% of its Q1 budget. Current spend: ₹11,250,000',
        severity: 'Medium',
        trigger_date: new Date().toISOString(),
        sent_to: adminUserId
      },
      {
        id: uuidv4(),
        type: 'Invoice Due',
        related_invoice_id: invoices[2].id,
        related_pod_id: pods[0].id,
        message: 'TCS Development Services invoice of ₹2,500,000 is due on March 17, 2024',
        severity: 'Medium',
        due_date: '2024-03-17',
        trigger_date: new Date().toISOString(),
        sent_to: adminUserId
      }
    ];

    for (const alert of alerts) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO alerts (alert_id, alert_type, related_invoice_id, related_pod_id, alert_message, severity, due_date, trigger_date, sent_to, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [alert.id, alert.type, alert.related_invoice_id, alert.related_pod_id, alert.message, alert.severity, alert.due_date, alert.trigger_date, alert.sent_to, 'Active'],
        (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('✅ Realistic sample data inserted successfully!');
    console.log('\n📊 Summary of added data:');
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Pods: ${pods.length}`);
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Vendor-Pod Allocations: ${vendorPodAllocations.length}`);
    console.log(`   Invoices: ${invoices.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Alerts: ${alerts.length}`);
    console.log('\n💰 Total Budget Across Companies: ₹120,000,000');
    console.log('💰 Total Invoice Amount: ₹8,790,000');
    console.log('💰 Total Paid Amount: ₹2,140,000');
    console.log('\n🚀 Your FinOps Tracker is now populated with realistic data!');
    console.log('📱 Refresh your dashboard to see the new data!');

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  } finally {
    db.close();
  }
}

// Run the data insertion
insertRealisticData();