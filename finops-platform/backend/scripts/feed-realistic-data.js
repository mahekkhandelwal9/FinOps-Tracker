const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Exact data structure provided by user
const realisticData = [
  {
    "month": "September",
    "status": "Paid",
    "pods": [
      {
        "pod_name": "AI Innovation Pod",
        "total_monthly_allocation": 200000,
        "vendors": [
          {"vendor": "Railways Pro Plan", "amount": 1700, "due_date": "22nd Of Every Month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Prepaid"},
          {"vendor": "Supabase", "amount": 2125, "due_date": "22nd Of Every Month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Postpaid"},
          {"vendor": "EC2", "amount": 14000, "due_date": "30th of Every Month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Postpaid"}
        ]
      },
      {
        "pod_name": "MBSG Pod",
        "total_monthly_allocation": 200000,
        "vendors": [
          {"vendor": "Pawan UI UX Designer", "amount": 150000, "due_date": "End of every Month", "payment_mode": "From Finance", "payment_type": "Opex", "payment_term": "PostPaid"},
          {"vendor": "Vercel (NextJS)", "amount": 1700, "due_date": "24th Of every Month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Prepaid"},
          {"vendor": "Railway Backend", "amount": 1700, "due_date": "24th Of every Month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Postpaid"},
          {"vendor": "Sanity CMS", "amount": 0, "due_date": "1st Of every month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Prepaid"},
          {"vendor": "SportsMonk API", "amount": 2550, "due_date": "24th Of every Month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Prepaid"},
          {"vendor": "Builder.io", "amount": 2550, "due_date": "Paid Once", "payment_mode": "CC", "payment_type": "Capex", "payment_term": "Prepaid"},
          {"vendor": "Recro (Tapas)", "amount": 146000, "due_date": "End of every Month", "payment_mode": "From Finance", "payment_type": "Opex", "payment_term": "PostPaid"}
        ]
      },
      {
        "pod_name": "TGS Pod",
        "total_monthly_allocation": 100000,
        "vendors": [
          {"vendor": "Zoho Analytics", "amount": 23000, "due_date": "3rd of every month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Prepaid"},
          {"vendor": "OpenAI+", "amount": 2000, "due_date": "15th of every month", "payment_mode": "CC", "payment_type": "Opex", "payment_term": "Prepaid"}
        ]
      }
    ]
  },
  {
    "month": "October",
    "status": "Paid",
    "pods": "Same as September"
  },
  {
    "month": "November",
    "status": "Unpaid",
    "pods": "Same as September"
  }
];

async function feedRealisticData() {
  try {
    console.log('📊 Feeding Realistic RPSG Data...');

    // Get existing data structure
    const existingPods = await db.query('SELECT pod_id, pod_name FROM pods');
    const existingUsers = await db.query('SELECT user_id FROM users LIMIT 1');

    console.log('🔍 Debug: Existing Pods:', existingPods);
    console.log('🔍 Debug: Existing Users:', existingUsers);

    if (!existingUsers || existingUsers.length === 0) {
      throw new Error('No users found. Please run setup-clean-rpsg.js first.');
    }

    const userId = existingUsers && existingUsers.length > 0 ? existingUsers[0].user_id : null;
    console.log(`✅ Found ${existingPods ? existingPods.length : 0} existing pods`);

    // Map pod names to IDs
    const podMap = {};
    if (existingPods && existingPods.length > 0) {
      existingPods.forEach(pod => {
        podMap[pod.pod_name] = pod.pod_id;
      });
    }

    // Clean any existing invoices, payments, vendors first
    await db.runQuery('DELETE FROM payments');
    await db.runQuery('DELETE FROM invoices');
    await db.runQuery('DELETE FROM vendor_pod_allocations');
    await db.runQuery('DELETE FROM vendors');
    await db.runQuery('DELETE FROM alerts');

    console.log('✅ Cleaned existing invoices, payments, and vendors');

    let totalInvoices = 0;
    let totalPayments = 0;
    let totalAmount = 0;

    // Process each month
    for (const monthData of realisticData) {
      console.log(`\n📅 Processing ${monthData.month} (${monthData.status})...`);

      let podsData = monthData.pods;

      // If pods are "Same as September", use September data
      if (podsData === "Same as September") {
        podsData = realisticData[0].pods;
      }

      for (const podData of podsData) {
        const podId = podMap[podData.pod_name];
        if (!podId) {
          console.log(`⚠️  Pod not found: ${podData.pod_name}`);
          continue;
        }

        console.log(`   🚀 ${podData.pod_name} - Budget: ₹${podData.total_monthly_allocation.toLocaleString('en-IN')}`);

        for (const vendorData of podData.vendors) {
          // Skip vendors with 0 amount (like Sanity CMS)
          if (vendorData.amount === 0) {
            console.log(`     ⏭️  Skipping ${vendorData.vendor}: ₹0 amount`);
            continue;
          }

          // Create or get vendor
          const vendorId = await createOrUpdateVendor(vendorData);

          // Create vendor-pod allocation
          await createVendorPodAllocation(vendorId, podId);

          // Create invoice
          console.log(`     📝 Creating invoice for ${vendorData.vendor} (Vendor ID: ${vendorId}, Pod ID: ${podId}, User ID: ${userId})`);
          const invoiceId = await createInvoice(
            vendorId,
            podId,
            vendorData,
            monthData.month,
            monthData.status,
            userId
          );

          // Create payment if status is "Paid"
          if (monthData.status === "Paid") {
            await createPayment(invoiceId, vendorId, podId, vendorData, monthData.month, userId);
            totalPayments++;
          }

          totalInvoices++;
          totalAmount += vendorData.amount;

          console.log(`     💰 ${vendorData.vendor}: ₹${vendorData.amount.toLocaleString('en-IN')} (${monthData.status})`);
        }
      }
    }

    // Update pod budgets with the allocations
    await updatePodBudgets();

    // Update company total budget
    await updateCompanyBudget();

    // Create alerts for unpaid invoices
    await createAlertsForUnpaidInvoices();

    console.log('\n✅ Realistic Data Feed Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   📋 Total Invoices: ${totalInvoices}`);
    console.log(`   💳 Total Payments: ${totalPayments}`);
    console.log(`   💰 Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`);
    console.log(`   👥 Vendors Created: ${(await db.query('SELECT COUNT(*) as count FROM vendors'))[0].count}`);
    console.log('');
    console.log('🎯 Your FinOps Tracker now has realistic data!');
    console.log('📱 Refresh your dashboard to see the new data!');

  } catch (error) {
    console.error('❌ Error feeding realistic data:', error);
  } finally {
    db.close();
  }
}

async function createOrUpdateVendor(vendorData) {
  // Check if vendor already exists
  const existingVendors = await db.query('SELECT vendor_id FROM vendors WHERE vendor_name = ?', [vendorData.vendor]);

  if (existingVendors.length > 0) {
    return existingVendors[0].vendor_id;
  }

  // Determine vendor type based on name
  let vendorType = 'Other';
  if (vendorData.vendor.includes('AWS') || vendorData.vendor.includes('EC2') || vendorData.vendor.includes('Supabase')) {
    vendorType = 'Cloud';
  } else if (vendorData.vendor.includes('Zoho') || vendorData.vendor.includes('Vercel') || vendorData.vendor.includes('OpenAI') ||
             vendorData.vendor.includes('Sentry') || vendorData.vendor.includes('Builder.io') || vendorData.vendor.includes('Sanity') ||
             vendorData.vendor.includes('Railway') || vendorData.vendor.includes('SportsMonk')) {
    vendorType = 'SaaS';
  } else if (vendorData.vendor.includes('Pawan') || vendorData.vendor.includes('Recro')) {
    vendorType = 'Staff Augmentation';
  }

  const vendorId = uuidv4();
  await db.runQuery(`
    INSERT INTO vendors (
      vendor_id, vendor_name, vendor_type, shared_status, payment_terms,
      default_due_days, poc_email, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [vendorId, vendorData.vendor, vendorType, 'Exclusive', vendorData.payment_term,
      getDueDays(vendorData.due_date), 'billing@' + vendorData.vendor.toLowerCase().replace(/\s+/g, '') + '.com', 'Active']);

  return vendorId;
}

async function createVendorPodAllocation(vendorId, podId) {
  // Check if allocation already exists
  const existingAllocation = await db.query(
    'SELECT allocation_id FROM vendor_pod_allocations WHERE vendor_id = ? AND pod_id = ?',
    [vendorId, podId]
  );

  if (existingAllocation.length > 0) {
    return existingAllocation[0].allocation_id;
  }

  const allocationId = uuidv4();
  await db.runQuery(`
    INSERT INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
    VALUES (?, ?, ?, ?)
  `, [allocationId, vendorId, podId, 100]); // 100% allocation for this pod

  return allocationId;
}

async function createInvoice(vendorId, podId, vendorData, month, status, userId) {
  const invoiceId = uuidv4();
  const currentYear = new Date().getFullYear();

  // Parse due date
  let dueDay = parseInt(vendorData.due_date.replace(/[^0-9]/g, ''));
  if (isNaN(dueDay)) dueDay = 20; // Default to 20th if parsing fails

  const invoiceDate = new Date(currentYear, getMonthNumber(month), 1);
  const dueDate = new Date(currentYear, getMonthNumber(month), dueDay);

  const invoiceStatus = status === 'Paid' ? 'Paid' : (status === 'Unpaid' ? 'Pending' : 'Pending');

  try {
    await db.runQuery(`
      INSERT INTO invoices (
        invoice_id, invoice_title, vendor_id, pod_id, invoice_month, amount,
        invoice_date, due_date, status, added_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [invoiceId, `${vendorData.vendor} - ${month} ${currentYear}`, vendorId, podId, month,
        vendorData.amount, invoiceDate.toISOString().split('T')[0], dueDate.toISOString().split('T')[0],
        invoiceStatus, userId]);
  } catch (error) {
    console.error(`❌ Error creating invoice for ${vendorData.vendor}:`, error);
    console.error(`Details: VendorId=${vendorId}, PodId=${podId}, UserId=${userId}, Amount=${vendorData.amount}`);
    throw error;
  }

  return invoiceId;
}

async function createPayment(invoiceId, vendorId, podId, vendorData, month, userId) {
  const paymentId = uuidv4();
  const currentYear = new Date().getFullYear();
  const paymentDate = new Date(currentYear, getMonthNumber(month), 15); // Paid mid-month

  const paymentMethod = vendorData.payment_mode === 'CC' ? 'Bank Transfer' : 'Bank Transfer';

  await db.runQuery(`
    INSERT INTO payments (
      payment_id, invoice_id, vendor_id, pod_id, payment_date, payment_amount,
      payment_method, recorded_by, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [paymentId, invoiceId, vendorId, podId, paymentDate.toISOString().split('T')[0],
      vendorData.amount, paymentMethod, userId, `Payment for ${vendorData.vendor} - ${month}`]);
}

async function updatePodBudgets() {
  // Update pod budgets based on September allocation (which is the standard)
  const septemberData = realisticData[0].pods;

  for (const podData of septemberData) {
    const podResult = await db.query('SELECT pod_id FROM pods WHERE pod_name = ?', [podData.pod_name]);
    if (podResult.length > 0) {
      await db.runQuery(`
        UPDATE pods
        SET budget_ceiling = ?, updated_at = CURRENT_TIMESTAMP
        WHERE pod_id = ?
      `, [podData.total_monthly_allocation, podResult[0].pod_id]);
    }
  }
}

async function updateCompanyBudget() {
  // Calculate total budget from pods
  const budgetResult = await db.query('SELECT SUM(budget_ceiling) as total FROM pods');
  const totalBudget = budgetResult[0].total || 0;

  await db.runQuery(`
    UPDATE companies
    SET total_budget = ?, updated_at = CURRENT_TIMESTAMP
    WHERE company_name LIKE '%RPSG%'
  `, [totalBudget]);
}

async function createAlertsForUnpaidInvoices() {
  const unpaidInvoices = await db.query(`
    SELECT i.invoice_id, i.vendor_id, i.pod_id, i.due_date, i.invoice_month,
           v.vendor_name, p.pod_name
    FROM invoices i
    JOIN vendors v ON i.vendor_id = v.vendor_id
    JOIN pods p ON i.pod_id = p.pod_id
    WHERE i.status = 'Pending'
  `);

  for (const invoice of unpaidInvoices) {
    const alertId = uuidv4();
    const dueDate = new Date(invoice.due_date);
    const today = new Date();

    let severity = 'Low';
    if (dueDate <= today) {
      severity = 'High';
    } else if ((dueDate - today) <= (7 * 24 * 60 * 60 * 1000)) { // Within 7 days
      severity = 'Medium';
    }

    await db.runQuery(`
      INSERT INTO alerts (
        alert_id, alert_type, related_invoice_id, related_pod_id, alert_message,
        severity, due_date, trigger_date, status, sent_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [alertId, 'Invoice Due', invoice.invoice_id, invoice.pod_id,
        `Invoice for ${invoice.vendor_name} (${invoice.vendor_name} - ${invoice.invoice_month}) is due`,
        severity, invoice.due_date, new Date().toISOString(), 'Active', 'admin@rpsg.com']);
  }
}

function getMonthNumber(monthName) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months.indexOf(monthName);
}

function getDueDays(dueDateText) {
  if (dueDateText.includes('End of every Month')) return 30;
  if (dueDateText.includes('Paid Once')) return 30;
  if (dueDateText.includes('After Invoice')) return 30;
  const day = parseInt(dueDateText.replace(/[^0-9]/g, ''));
  return isNaN(day) ? 20 : day;
}

if (require.main === module) {
  feedRealisticData();
}

module.exports = feedRealisticData;