const express = require('express');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Get company dashboard data
router.get('/company/:company_id', authenticateToken, async (req, res) => {
  try {
    const { company_id } = req.params;
    const { period = 'current_month' } = req.query;

    // Calculate date range and multiplier based on period
    let dateCondition = '';
    let periodMultiplier = 1; // Default to 1 for current_month

    const now = new Date();
    const currentYear = now.getFullYear();

    if (period === 'current_month') {
      const startOfMonth = new Date(currentYear, now.getMonth(), 1);
      dateCondition = `AND i.invoice_date >= '${startOfMonth.toISOString().split('T')[0]}'`;
      periodMultiplier = 1;
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(currentYear, now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(currentYear, now.getMonth(), 0);
      dateCondition = `AND i.invoice_date >= '${startOfLastMonth.toISOString().split('T')[0]}' AND i.invoice_date <= '${endOfLastMonth.toISOString().split('T')[0]}'`;
      periodMultiplier = 1;
    } else if (period === 'quarter') {
      // Get last 3 months (current + 2 previous)
      const quarterStart = new Date(currentYear, now.getMonth() - 2, 1);
      dateCondition = `AND i.invoice_date >= '${quarterStart.toISOString().split('T')[0]}'`;
      periodMultiplier = 3;
    } else if (period === 'year') {
      // Get last 12 months
      const yearStart = new Date(currentYear, now.getMonth() - 11, 1);
      dateCondition = `AND i.invoice_date >= '${yearStart.toISOString().split('T')[0]}'`;
      periodMultiplier = 12;
    }

    // Get company details and static pod budgets (without time filtering)
    const companyData = await db.query(`
      SELECT
        c.company_id,
        c.company_name,
        c.total_budget,
        c.currency,
        c.financial_period,
        COUNT(DISTINCT p.pod_id) as total_pods,
        COUNT(DISTINCT vpa.vendor_id) as total_vendors,
        COALESCE(SUM(p.budget_ceiling), 0) as total_monthly_budget
      FROM companies c
      LEFT JOIN pods p ON c.company_id = p.company_id AND p.status = 'Active'
      LEFT JOIN vendor_pod_allocations vpa ON p.pod_id = vpa.pod_id
      WHERE c.company_id = ? AND c.status = 'Active'
    `, [company_id]);

    if (companyData.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get time-filtered invoice and payment data
    const invoiceData = await db.query(`
      SELECT
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_invoice_amount,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN i.status = 'Pending' AND julianday(i.due_date) - julianday('now') <= 7 THEN 1 END) as due_soon_invoices,
        COUNT(CASE WHEN i.status = 'Paid' THEN 1 END) as paid_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Pending' THEN i.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Overdue' THEN i.amount ELSE 0 END), 0) as overdue_amount
      FROM companies c
      LEFT JOIN pods p ON c.company_id = p.company_id AND p.status = 'Active'
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      WHERE c.company_id = ? AND c.status = 'Active' ${dateCondition}
    `, [company_id]);

    // Combine the results
    const company = companyData[0];
    const allData = invoiceData[0] || {};

    const overview = {
      ...company,
      // Calculate period-specific budget
      total_budget: company.total_monthly_budget * periodMultiplier,
      total_invoices: allData.total_invoices || 0,
      total_invoice_amount: allData.total_invoice_amount || 0,
      pending_invoices: allData.pending_invoices || 0,
      overdue_invoices: allData.overdue_invoices || 0,
      due_soon_invoices: allData.due_soon_invoices || 0,
      paid_invoices: allData.paid_invoices || 0,
      paid_amount: allData.paid_amount || 0,
      pending_amount: allData.pending_amount || 0,
      overdue_amount: allData.overdue_amount || 0,
      // Add period info for frontend
      period_multiplier: periodMultiplier,
      period_type: period
    };

    // Pod budget split - get static pod data and time-based spend separately
    const staticPodData = await db.query(`
      SELECT
        p.pod_id,
        p.pod_name,
        p.budget_ceiling,
        u.name as owner_name
      FROM pods p
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      WHERE p.company_id = ? AND p.status = 'Active'
      ORDER BY p.budget_ceiling DESC
    `, [company_id]);

    // Get time-filtered invoice data for each pod
    const podInvoiceData = await db.query(`
      SELECT
        i.pod_id,
        COUNT(DISTINCT i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_spend
      FROM invoices i
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE p.company_id = ? ${dateCondition}
      GROUP BY i.pod_id
    `, [company_id]);

    // Combine static pod data with time-filtered invoice data and apply period multiplier
    const podBudgetSplit = staticPodData.map(pod => {
      const invoiceData = podInvoiceData.find(data => data.pod_id === pod.pod_id) || {};
      const budgetUsed = invoiceData.total_spend || 0;
      const periodBudgetCeiling = pod.budget_ceiling * periodMultiplier;

      return {
        ...pod,
        budget_used: budgetUsed,
        budget_ceiling: periodBudgetCeiling, // Update to period-specific budget
        budget_remaining: Math.max(0, periodBudgetCeiling - budgetUsed),
        budget_status: budgetUsed > periodBudgetCeiling ? 'Over Budget' : 'Within Limit',
        utilization_percentage: periodBudgetCeiling > 0 ? Math.round((budgetUsed / periodBudgetCeiling) * 100 * 100) / 100 : 0,
        invoice_count: invoiceData.invoice_count || 0,
        total_spend: budgetUsed,
        // Keep original monthly budget for reference
        monthly_budget_ceiling: pod.budget_ceiling
      };
    }).sort((a, b) => b.total_spend - a.total_spend);

    // Budget utilization chart
    const budgetUtilization = await db.query(`
      SELECT
        p.pod_name,
        p.budget_ceiling,
        p.budget_used,
        p.budget_remaining,
        ROUND((p.budget_used / p.budget_ceiling) * 100, 2) as utilization_percentage
      FROM pods p
      WHERE p.company_id = ? AND p.status = 'Active'
      ORDER BY p.budget_used DESC
    `, [company_id]);

    // Category spend chart
    const categorySpend = await db.query(`
      SELECT
        v.vendor_type,
        COUNT(DISTINCT i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_spend,
        ROUND((COALESCE(SUM(i.amount), 0) / (
          SELECT COALESCE(SUM(ii.amount), 0)
          FROM invoices ii
          LEFT JOIN pods pp ON ii.pod_id = pp.pod_id
          WHERE pp.company_id = ?
        )) * 100, 2) as percentage_of_total
      FROM pods p
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE p.company_id = ? AND p.status = 'Active'
      GROUP BY v.vendor_type
      ORDER BY total_spend DESC
    `, [company_id, company_id]);

    // Trend chart (last 12 months)
    const trendChart = await db.query(`
      SELECT
        substr(i.invoice_month, 1, 4) as year,
        substr(i.invoice_month, 6, 2) as month,
        i.invoice_month,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COUNT(CASE WHEN i.status = 'Paid' THEN 1 END) as paid_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as paid_amount
      FROM invoices i
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE p.company_id = ? AND p.status = 'Active'
      GROUP BY i.invoice_month
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [company_id]);

    // Vendor trend comparison
    const vendorTrends = await db.query(`
      SELECT
        v.vendor_id,
        v.vendor_name,
        v.vendor_type,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COALESCE(AVG(i.amount), 0) as average_amount,
        MIN(i.invoice_date) as first_invoice_date,
        MAX(i.invoice_date) as last_invoice_date
      FROM vendors v
      JOIN vendor_pod_allocations vpa ON v.vendor_id = vpa.vendor_id
      LEFT JOIN invoices i ON v.vendor_id = i.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE p.company_id = ? AND v.status = 'Active'
      GROUP BY v.vendor_id
      HAVING total_amount > 0
      ORDER BY total_amount DESC
      LIMIT 10
    `, [company_id]);

    // Alerts summary
    const alertsSummary = await db.query(`
      SELECT
        COUNT(CASE WHEN a.alert_type = 'Invoice Due' THEN 1 END) as due_invoices,
        COUNT(CASE WHEN a.alert_type = 'Invoice Overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN a.alert_type = 'Budget Threshold' THEN 1 END) as budget_alerts,
        COUNT(CASE WHEN a.severity = 'High' THEN 1 END) as high_priority,
        COUNT(CASE WHEN a.severity = 'Medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN a.severity = 'Low' THEN 1 END) as low_priority
      FROM alerts a
      WHERE a.related_pod_id IN (
        SELECT pod_id FROM pods WHERE company_id = ? AND status = 'Active'
      ) AND a.status = 'Active'
    `, [company_id]);

    // Recent invoices (time-filtered)
    const recentInvoices = await db.query(`
      SELECT
        i.invoice_id,
        i.invoice_title,
        i.amount,
        i.due_date,
        i.status,
        i.invoice_date,
        v.vendor_name,
        p.pod_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE p.company_id = ? ${dateCondition}
      ORDER BY i.invoice_date DESC
      LIMIT 10
    `, [company_id]);

    res.json({
      overview: overview[0],
      podBudgetSplit,
      budgetUtilization,
      categorySpend,
      trendChart,
      vendorTrends,
      alertsSummary: alertsSummary[0],
      recentInvoices
    });

  } catch (error) {
    console.error('Company dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pod dashboard data
router.get('/pod/:pod_id', authenticateToken, async (req, res) => {
  try {
    const { pod_id } = req.params;
    const { period = 'current_month' } = req.query;

    // Calculate date range based on period
    let dateCondition = '';
    const now = new Date();

    if (period === 'current_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateCondition = `AND i.invoice_date >= '${startOfMonth.toISOString().split('T')[0]}'`;
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dateCondition = `AND i.invoice_date >= '${startOfLastMonth.toISOString().split('T')[0]}' AND i.invoice_date <= '${endOfLastMonth.toISOString().split('T')[0]}'`;
    }

    // Get pod overview
    const overview = await db.query(`
      SELECT
        p.pod_id,
        p.pod_name,
        p.description,
        p.budget_ceiling,
        p.budget_used,
        p.budget_remaining,
        p.budget_status,
        p.threshold_alert,
        p.currency,
        ROUND((p.budget_used / p.budget_ceiling) * 100, 2) as utilization_percentage,
        c.company_name,
        u.name as owner_name,
        COUNT(DISTINCT vpa.vendor_id) as total_vendors,
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_invoice_amount,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN i.status = 'Pending' AND julianday(i.due_date) - julianday('now') <= 7 THEN 1 END) as due_soon_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Pending' THEN i.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Overdue' THEN i.amount ELSE 0 END), 0) as overdue_amount
      FROM pods p
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      LEFT JOIN vendor_pod_allocations vpa ON p.pod_id = vpa.pod_id
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      WHERE p.pod_id = ? AND p.status = 'Active'
      ${dateCondition}
    `, [pod_id]);

    if (overview.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    // Vendor-wise spending
    const vendorSpending = await db.query(`
      SELECT
        v.vendor_id,
        v.vendor_name,
        v.vendor_type,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COALESCE(AVG(i.amount), 0) as average_amount,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END) as overdue_count
      FROM vendor_pod_allocations vpa
      LEFT JOIN vendors v ON vpa.vendor_id = v.vendor_id
      LEFT JOIN invoices i ON v.vendor_id = i.vendor_id AND i.pod_id = ?
      WHERE vpa.pod_id = ? AND v.status = 'Active'
      GROUP BY v.vendor_id
      ORDER BY total_amount DESC
    `, [pod_id, pod_id]);

    // Budget category breakdown
    const budgetCategories = await db.query(`
      SELECT
        bc.category_name,
        bc.allocated_amount,
        bc.utilized_amount,
        bc.remaining_amount,
        ROUND((bc.utilized_amount / bc.allocated_amount) * 100, 2) as utilization_percentage,
        COUNT(CASE WHEN v.vendor_type = bc.category_name THEN i.invoice_id END) as invoice_count,
        COALESCE(SUM(CASE WHEN v.vendor_type = bc.category_name THEN i.amount ELSE 0 END), 0) as actual_spend
      FROM budget_categories bc
      LEFT JOIN invoices i ON i.pod_id = bc.pod_id
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE bc.pod_id = ?
      GROUP BY bc.category_id
      ORDER BY bc.allocated_amount DESC
    `, [pod_id]);

    // Monthly trend
    const monthlyTrend = await db.query(`
      SELECT
        substr(i.invoice_month, 1, 4) as year,
        substr(i.invoice_month, 6, 2) as month,
        i.invoice_month,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COUNT(CASE WHEN i.status = 'Paid' THEN 1 END) as paid_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as paid_amount
      FROM invoices i
      WHERE i.pod_id = ?
      GROUP BY i.invoice_month
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [pod_id]);

    // Upcoming payments
    const upcomingPayments = await db.query(`
      SELECT
        i.invoice_id,
        i.invoice_title,
        i.amount,
        i.due_date,
        v.vendor_name,
        v.poc_email,
        CASE
          WHEN julianday(i.due_date) - julianday('now') < 0 THEN 'Overdue'
          WHEN julianday(i.due_date) - julianday('now') <= 7 THEN 'Due Soon'
          ELSE 'Scheduled'
        END as urgency_status,
        julianday(i.due_date) - julianday('now') as days_until_due
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE i.pod_id = ? AND i.status != 'Paid'
      ORDER BY i.due_date ASC
      LIMIT 20
    `, [pod_id]);

    // Recent activity
    const recentActivity = await db.query(`
      SELECT
        'invoice' as activity_type,
        i.invoice_title as title,
        i.amount,
        i.status,
        i.created_at,
        v.vendor_name as related_entity,
        u.name as user_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN users u ON i.added_by = u.user_id
      WHERE i.pod_id = ?

      UNION ALL

      SELECT
        'payment' as activity_type,
        i.invoice_title as title,
        p.payment_amount as amount,
        'Paid' as status,
        p.created_at,
        v.vendor_name as related_entity,
        u.name as user_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.invoice_id
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN users u ON p.recorded_by = u.user_id
      WHERE p.pod_id = ?

      ORDER BY created_at DESC
      LIMIT 10
    `, [pod_id, pod_id]);

    // Alerts for this pod
    const alerts = await db.query(`
      SELECT
        alert_id,
        alert_type,
        alert_message,
        severity,
        due_date,
        status,
        created_at
      FROM alerts
      WHERE related_pod_id = ? AND status = 'Active'
      ORDER BY severity DESC, created_at DESC
      LIMIT 10
    `, [pod_id]);

    res.json({
      overview: overview[0],
      vendorSpending,
      budgetCategories,
      monthlyTrend,
      upcomingPayments,
      recentActivity,
      alerts
    });

  } catch (error) {
    console.error('Pod dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top vendors by spend
router.get('/vendors/top-spenders', authenticateToken, async (req, res) => {
  try {
    const { company_id, pod_id, limit = 10 } = req.query;

    let query = `
      SELECT
        v.vendor_id,
        v.vendor_name,
        v.vendor_type,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COALESCE(AVG(i.amount), 0) as average_amount,
        MIN(i.invoice_date) as first_invoice_date,
        MAX(i.invoice_date) as last_invoice_date
      FROM vendors v
      LEFT JOIN invoices i ON v.vendor_id = i.vendor_id
      WHERE 1=1
    `;

    const params = [];

    if (company_id) {
      query += ` AND i.pod_id IN (SELECT pod_id FROM pods WHERE company_id = ?)`;
      params.push(company_id);
    }

    if (pod_id) {
      query += ' AND i.pod_id = ?';
      params.push(pod_id);
    }

    query += `
      AND v.status = 'Active'
      GROUP BY v.vendor_id
      HAVING total_amount > 0
      ORDER BY total_amount DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const vendors = await db.query(query, params);
    res.json({ vendors });

  } catch (error) {
    console.error('Top vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get spend trends by category
router.get('/spending/category-trends', authenticateToken, async (req, res) => {
  try {
    const { company_id, pod_id, months = 12 } = req.query;

    let query = `
      SELECT
        v.vendor_type,
        substr(i.invoice_month, 1, 7) as month,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE 1=1
    `;

    const params = [];

    if (company_id) {
      query += ` AND i.pod_id IN (SELECT pod_id FROM pods WHERE company_id = ?)`;
      params.push(company_id);
    }

    if (pod_id) {
      query += ' AND i.pod_id = ?';
      params.push(pod_id);
    }

    query += `
      GROUP BY v.vendor_type, substr(i.invoice_month, 1, 7)
      ORDER BY month DESC, total_amount DESC
      LIMIT ?
    `;
    params.push(parseInt(months) * 10); // Approximate limit for months x categories

    const trends = await db.query(query, params);
    res.json({ trends });

  } catch (error) {
    console.error('Category trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;