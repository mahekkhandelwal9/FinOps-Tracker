const db = require('./config/database');

async function fixBudgets() {
  try {
    console.log('🔧 Fixing Budgets to User Requirements');

    // Update company budget to ₹5L monthly
    await db.runQuery(`
      UPDATE companies
      SET total_budget = 500000,
          updated_at = CURRENT_TIMESTAMP
      WHERE company_id = 'rpsg-company-001'
    `);
    console.log('✅ Updated company monthly budget to ₹5,00,000');

    // Update pod budgets as per user requirements:
    // MBSG Pod: ₹2L, AI Pod: ₹2L, TGS Pod: ₹1L (total ₹5L)
    await db.runQuery(`
      UPDATE pods
      SET budget_ceiling = 200000,
          updated_at = CURRENT_TIMESTAMP
      WHERE pod_id = 'rpsg-pod-mbsg-001'
    `);
    console.log('✅ Updated MBSG Pod budget to ₹2,00,000');

    await db.runQuery(`
      UPDATE pods
      SET budget_ceiling = 200000,
          updated_at = CURRENT_TIMESTAMP
      WHERE pod_id = 'rpsg-pod-ai-001'
    `);
    console.log('✅ Updated AI Innovation Pod budget to ₹2,00,000');

    await db.runQuery(`
      UPDATE pods
      SET budget_ceiling = 100000,
          updated_at = CURRENT_TIMESTAMP
      WHERE pod_id = 'rpsg-pod-tgs-001'
    `);
    console.log('✅ Updated TGS Pod budget to ₹1,00,000');

    // Verify the fixes
    const companyData = await db.query(`
      SELECT
        c.company_id,
        c.company_name,
        c.total_budget,
        COALESCE(SUM(p.budget_ceiling), 0) as total_monthly_budget
      FROM companies c
      LEFT JOIN pods p ON c.company_id = p.company_id AND p.status = 'Active'
      WHERE c.company_id = 'rpsg-company-001'
      GROUP BY c.company_id
    `);

    console.log('\n📊 Fixed Company Data:');
    console.log(`   Company: ${companyData[0].company_name}`);
    console.log(`   Monthly Budget: ₹${companyData[0].total_budget.toLocaleString('en-IN')}`);
    console.log(`   Pod Total: ₹${companyData[0].total_monthly_budget.toLocaleString('en-IN')}`);

    const podData = await db.query(`
      SELECT pod_id, pod_name, budget_ceiling
      FROM pods
      WHERE company_id = 'rpsg-company-001' AND status = 'Active'
      ORDER BY budget_ceiling DESC
    `);

    console.log('\n🚀 Fixed Pod Budgets:');
    podData.forEach(pod => {
      console.log(`   ${pod.pod_name}: ₹${pod.budget_ceiling.toLocaleString('en-IN')}`);
    });

    console.log('\n✅ Budgets Fixed Successfully!');
    console.log('📱 Refresh your dashboard to see the corrected values.');

  } catch (error) {
    console.error('❌ Error fixing budgets:', error);
  } finally {
    db.close();
  }
}

fixBudgets();