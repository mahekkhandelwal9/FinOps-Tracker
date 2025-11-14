const db = require('./config/database');

async function debugBudgets() {
  try {
    console.log('🔍 Debug: Budget Calculations');

    // Check company data
    const companyData = await db.query(`
      SELECT
        c.company_id,
        c.company_name,
        c.total_budget,
        c.currency,
        COUNT(DISTINCT p.pod_id) as total_pods,
        COUNT(DISTINCT vpa.vendor_id) as total_vendors,
        COALESCE(SUM(p.budget_ceiling), 0) as total_monthly_budget
      FROM companies c
      LEFT JOIN pods p ON c.company_id = p.company_id AND p.status = 'Active'
      LEFT JOIN vendor_pod_allocations vpa ON p.pod_id = vpa.pod_id
      WHERE c.company_id = 'rpsg-company-001' AND c.status = 'Active'
      GROUP BY c.company_id
    `);

    console.log('📊 Company Data:', JSON.stringify(companyData[0], null, 2));

    // Check individual pod budgets
    const podData = await db.query(`
      SELECT pod_id, pod_name, budget_ceiling, budget_used
      FROM pods
      WHERE company_id = 'rpsg-company-001' AND status = 'Active'
      ORDER BY budget_ceiling DESC
    `);

    console.log('🚀 Pod Data:', JSON.stringify(podData, null, 2));

    // Calculate what the total should be
    const monthlyTotal = podData.reduce((sum, pod) => sum + (pod.budget_ceiling || 0), 0);
    console.log(`💰 Calculated Monthly Total: ₹${monthlyTotal.toLocaleString('en-IN')}`);
    console.log(`📈 Calculated Quarterly Total: ₹${(monthlyTotal * 3).toLocaleString('en-IN')}`);
    console.log(`📅 Calculated Yearly Total: ₹${(monthlyTotal * 12).toLocaleString('en-IN')}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

debugBudgets();