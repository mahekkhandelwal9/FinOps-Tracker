const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database path
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

async function addRPSGData() {
  console.log('🚀 Adding correct RPSG data to FinOps Platform...');

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

    // Clear existing incorrect data
    console.log('🧹 Clearing incorrect sample data...');
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM alerts', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM payments', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM invoices', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM vendor_pod_allocations', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM vendors', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM pods', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM companies', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Add RPSG Company
    const rpsgCompany = {
      id: uuidv4(),
      name: 'RPSG',
      total_budget: 120000000, // ₹120 Crore (based on Excel data)
      currency: 'INR',
      financial_period: 'Yearly',
      notes: 'RP-Sanjiv Goenka Group - Multi-business conglomerate'
    };

    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO companies (company_id, company_name, total_budget, currency, financial_period, notes, created_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [rpsgCompany.id, rpsgCompany.name, rpsgCompany.total_budget, rpsgCompany.currency, rpsgCompany.financial_period, rpsgCompany.notes, adminUserId, 'Active'],
      (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Add the 3 RPSG Pods with realistic budget allocations
    const pods = [
      {
        id: uuidv4(),
        company_id: rpsgCompany.id,
        name: 'AI',
        budget_ceiling: 40000000, // ₹40 Crore
        description: 'Artificial Intelligence and Machine Learning Initiatives'
      },
      {
        id: uuidv4(),
        company_id: rpsgCompany.id,
        name: 'MBSG',
        budget_ceiling: 45000000, // ₹45 Crore
        description: 'Modern Business and Strategy Group'
      },
      {
        id: uuidv4(),
        company_id: rpsgCompany.id,
        name: 'TGS',
        budget_ceiling: 35000000, // ₹35 Crore
        description: 'Technology and Governance Solutions'
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

    // Add 12 Realistic Vendors based on Excel data categories
    const vendors = [
      // Cloud Infrastructure
      { id: uuidv4(), name: 'AWS India', type: 'Cloud', shared_status: 'Shared', poc_email: 'support@aws.in', poc_phone: '+91-80-12345678', payment_terms: 'NET 30', default_due_days: 30, notes: 'Primary cloud services provider' },
      { id: uuidv4(), name: 'Microsoft Azure', type: 'Cloud', shared_status: 'Shared', poc_email: 'support@microsoft.in', poc_phone: '+91-80-87654321', payment_terms: 'NET 30', default_due_days: 30, notes: 'Enterprise cloud services' },
      { id: uuidv4(), name: 'Google Cloud Platform', type: 'Cloud', shared_status: 'Shared', poc_email: 'support@google.in', poc_phone: '+91-80-55556666', payment_terms: 'NET 30', default_due_days: 30, notes: 'Cloud computing and data analytics' },

      // SaaS Providers
      { id: uuidv4(), name: 'Salesforce India', type: 'SaaS', shared_status: 'Shared', poc_email: 'support@salesforce.com', poc_phone: '+91-80-44445555', payment_terms: 'NET 60', default_due_days: 60, notes: 'CRM and business solutions' },
      { id: uuidv4(), name: 'Microsoft 365', type: 'SaaS', shared_status: 'Shared', poc_email: 'support@microsoft.in', poc_phone: '+91-80-33334444', payment_terms: 'NET 45', default_due_days: 45, notes: 'Office productivity suite' },
      { id: uuidv4(), name: 'Oracle Cloud', type: 'SaaS', shared_status: 'Shared', poc_email: 'support@oracle.in', poc_phone: '+91-80-22223333', payment_terms: 'NET 60', default_due_days: 60, notes: 'ERP and database solutions' },

      // Staff Augmentation
      { id: uuidv4(), name: 'Tata Consultancy Services', type: 'Staff Augmentation', shared_status: 'Exclusive', poc_email: 'rpsg@tcs.com', poc_phone: '+91-22-98765432', payment_terms: 'NET 45', default_due_days: 45, notes: 'Dedicated development team for AI' },
      { id: uuidv4(), name: 'Infosys Limited', type: 'Staff Augmentation', shared_status: 'Exclusive', poc_email: 'rpsg@infosys.com', poc_phone: '+91-80-11223344', payment_terms: 'NET 45', default_due_days: 45, notes: 'MBSG digital transformation team' },
      { id: uuidv4(), name: 'Wipro Limited', type: 'Staff Augmentation', shared_status: 'Exclusive', poc_email: 'rpsg@wipro.com', poc_phone: '+91-80-55667788', payment_terms: 'NET 30', default_due_days: 30, notes: 'TGS infrastructure management' },

      // Other Services
      { id: uuidv4(), name: 'Deloitte India', type: 'Other', shared_status: 'Shared', poc_email: 'rpsg@deloitte.com', poc_phone: '+91-80-99887766', payment_terms: 'NET 60', default_due_days: 60, notes: 'Consulting and advisory services' },
      { id: uuidv4(), name: 'IBM India', type: 'Other', shared_status: 'Shared', poc_email: 'support@ibm.in', poc_phone: '+91-80-88776655', payment_terms: 'NET 45', default_due_days: 45, notes: 'AI and blockchain solutions' },
      { id: uuidv4(), name: 'Accenture India', type: 'Other', shared_status: 'Shared', poc_email: 'rpsg@accenture.com', poc_phone: '+91-80-77554433', payment_terms: 'NET 60', default_due_days: 60, notes: 'Digital transformation consulting' }
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

    // Vendor-Pod allocations based on Excel data
    const vendorPodAllocations = [
      // AWS - Shared across all pods
      { vendor_id: vendors[0].id, pod_id: pods[0].id, percentage: 40 }, // AI
      { vendor_id: vendors[0].id, pod_id: pods[1].id, percentage: 35 }, // MBSG
      { vendor_id: vendors[0].id, pod_id: pods[2].id, percentage: 25 }, // TGS

      // Azure - Primarily AI and TGS
      { vendor_id: vendors[1].id, pod_id: pods[0].id, percentage: 50 }, // AI
      { vendor_id: vendors[1].id, pod_id: pods[2].id, percentage: 50 }, // TGS

      // Google Cloud - AI focused
      { vendor_id: vendors[2].id, pod_id: pods[0].id, percentage: 100 }, // AI

      // SaaS vendors across pods
      { vendor_id: vendors[3].id, pod_id: pods[1].id, percentage: 100 }, // Salesforce - MBSG
      { vendor_id: vendors[4].id, pod_id: pods[0].id, percentage: 33 }, // Microsoft 365 - AI
      { vendor_id: vendors[4].id, pod_id: pods[1].id, percentage: 34 }, // Microsoft 365 - MBSG
      { vendor_id: vendors[4].id, pod_id: pods[2].id, percentage: 33 }, // Microsoft 365 - TGS
      { vendor_id: vendors[5].id, pod_id: pods[2].id, percentage: 100 }, // Oracle - TGS

      // Staff Augmentation - Exclusive to each pod
      { vendor_id: vendors[6].id, pod_id: pods[0].id, percentage: 100 }, // TCS - AI
      { vendor_id: vendors[7].id, pod_id: pods[1].id, percentage: 100 }, // Infosys - MBSG
      { vendor_id: vendors[8].id, pod_id: pods[2].id, percentage: 100 }, // Wipro - TGS

      // Other services - Shared
      { vendor_id: vendors[9].id, pod_id: pods[1].id, percentage: 100 }, // Deloitte - MBSG
      { vendor_id: vendors[10].id, pod_id: pods[0].id, percentage: 100 }, // IBM - AI
      { vendor_id: vendors[11].id, pod_id: pods[1].id, percentage: 60 }, // Accenture - MBSG
      { vendor_id: vendors[11].id, pod_id: pods[2].id, percentage: 40 }, // Accenture - TGS
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

    // Add realistic invoices based on Excel data patterns
    const invoices = [
      {
        id: uuidv4(), vendor_id: vendors[0].id, pod_id: pods[0].id,
        title: 'AWS Services - AI Pod January 2024', invoice_month: '2024-01',
        amount: 2800000, invoice_date: '2024-01-31', due_date: '2024-03-01',
        status: 'Paid', notes: 'EC2 instances for AI model training'
      },
      {
        id: uuidv4(), vendor_id: vendors[6].id, pod_id: pods[0].id,
        title: 'TCS Development Team - AI January 2024', invoice_month: '2024-01',
        amount: 4500000, invoice_date: '2024-02-01', due_date: '2024-03-17',
        status: 'Pending', notes: 'AI development team services'
      },
      {
        id: uuidv4(), vendor_id: vendors[1].id, pod_id: pods[2].id,
        title: 'Azure Cloud - TGS January 2024', invoice_month: '2024-01',
        amount: 1950000, invoice_date: '2024-01-30', due_date: '2024-02-29',
        status: 'Paid', notes: 'TGS cloud infrastructure'
      },
      {
        id: uuidv4(), vendor_id: vendors[3].id, pod_id: pods[1].id,
        title: 'Salesforce Licenses - MBSG Q1 2024', invoice_month: '2024-01',
        amount: 1200000, invoice_date: '2024-02-01', due_date: '2024-04-01',
        status: 'Overdue', notes: 'Annual CRM license renewal'
      },
      {
        id: uuidv4(), vendor_id: vendors[7].id, pod_id: pods[1].id,
        title: 'Infosys Digital Transformation - MBSG January 2024', invoice_month: '2024-01',
        amount: 3800000, invoice_date: '2024-02-01', due_date: '2024-03-17',
        status: 'Pending', notes: 'MBSG digital platform development'
      },
      {
        id: uuidv4(), vendor_id: vendors[8].id, pod_id: pods[2].id,
        title: 'Wipro Infrastructure Management - TGS February 2024', invoice_month: '2024-02',
        amount: 2200000, invoice_date: '2024-03-01', due_date: '2024-03-31',
        status: 'Pending', notes: 'TGS infrastructure support'
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

    // Add payments for paid invoices
    const payments = [
      {
        id: uuidv4(), invoice_id: invoices[0].id, vendor_id: invoices[0].vendor_id, pod_id: invoices[0].pod_id,
        payment_date: '2024-02-25', payment_amount: 2800000,
        payment_method: 'Bank Transfer', reference_number: 'TXN20240225001',
        remarks: 'AWS AI services payment - January 2024'
      },
      {
        id: uuidv4(), invoice_id: invoices[2].id, vendor_id: invoices[2].vendor_id, pod_id: invoices[2].pod_id,
        payment_date: '2024-02-20', payment_amount: 1950000,
        payment_method: 'Bank Transfer', reference_number: 'TXN20240220002',
        remarks: 'Azure TGS services payment - January 2024'
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

    // Add alerts
    const alerts = [
      {
        id: uuidv4(), type: 'Invoice Overdue', related_invoice_id: invoices[3].id, related_pod_id: pods[1].id,
        message: 'Salesforce Licenses invoice (₹1,200,000) for MBSG is overdue since April 1, 2024',
        severity: 'High', due_date: '2024-04-01', trigger_date: new Date().toISOString(), sent_to: adminUserId
      },
      {
        id: uuidv4(), type: 'Budget Threshold', related_pod_id: pods[0].id,
        message: 'AI Pod has utilized 82.5% of quarterly budget. Current spend: ₹33,000,000 of ₹40,000,000',
        severity: 'High', trigger_date: new Date().toISOString(), sent_to: adminUserId
      },
      {
        id: uuidv4(), type: 'Invoice Due', related_invoice_id: invoices[1].id, related_pod_id: pods[0].id,
        message: 'TCS Development Services invoice of ₹4,500,000 for AI Pod is due on March 17, 2024',
        severity: 'Medium', due_date: '2024-03-17', trigger_date: new Date().toISOString(), sent_to: adminUserId
      },
      {
        id: uuidv4(), type: 'Manual', related_invoice_id: invoices[2].id, related_pod_id: pods[2].id,
        message: 'Payment of ₹1,950,000 processed to Microsoft Azure for TGS services',
        severity: 'Low', trigger_date: new Date().toISOString(), sent_to: adminUserId
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

    console.log('✅ Correct RPSG data inserted successfully!');
    console.log('\n📊 RPSG Data Summary:');
    console.log(`   Company: RPSG (₹${(rpsgCompany.total_budget/10000000).toFixed(1)} Crore)`);
    console.log(`   Pods: ${pods.length} (AI: ₹${(pods[0].budget_ceiling/10000000).toFixed(1)}C, MBSG: ₹${(pods[1].budget_ceiling/10000000).toFixed(1)}C, TGS: ₹${(pods[2].budget_ceiling/10000000).toFixed(1)}C)`);
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Vendor-Pod Allocations: ${vendorPodAllocations.length}`);
    console.log(`   Invoices: ${invoices.length} (Paid: 2, Pending: 3, Overdue: 1)`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Alerts: ${alerts.length}`);
    console.log('\n💰 Total Invoice Amount: ₹' + invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString('en-IN'));
    console.log('💰 Total Paid Amount: ₹' + payments.reduce((sum, pay) => sum + pay.payment_amount, 0).toLocaleString('en-IN'));
    console.log('\n🚀 Your FinOps Tracker now has the correct RPSG data!');
    console.log('📱 Refresh your dashboard to see the correct RPSG structure!');

  } catch (error) {
    console.error('❌ Error adding RPSG data:', error);
  } finally {
    db.close();
  }
}

// Run the RPSG data insertion
addRPSGData();