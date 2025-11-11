const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Get all pods (with optional company filter)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { company_id } = req.query;

    let query = `
      SELECT p.*, c.company_name, u.name as owner_name,
             COUNT(DISTINCT i.invoice_id) as invoice_count,
             ROUND((p.budget_used / p.budget_ceiling) * 100, 2) as utilization_percentage
      FROM pods p
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      WHERE p.status = 'Active'
    `;

    const params = [];
    if (company_id) {
      query += ' AND p.company_id = ?';
      params.push(company_id);
    }

    query += ' GROUP BY p.pod_id ORDER BY p.created_at DESC';

    const pods = await db.query(query, params);
    res.json({ pods });

  } catch (error) {
    console.error('Get pods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single pod with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const pods = await db.query(`
      SELECT p.*, c.company_name, u.name as owner_name
      FROM pods p
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      WHERE p.pod_id = ?
    `, [id]);

    if (pods.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    const pod = pods[0];

    // Get vendors for this pod
    const vendors = await db.query(`
      SELECT DISTINCT v.*, vpa.allocation_percentage
      FROM vendors v
      JOIN vendor_pod_allocations vpa ON v.vendor_id = vpa.vendor_id
      WHERE vpa.pod_id = ? AND v.status = 'Active'
      ORDER BY v.vendor_name
    `, [id]);

    // Get budget categories
    const budgetCategories = await db.query(`
      SELECT *
      FROM budget_categories
      WHERE pod_id = ?
      ORDER BY category_name
    `, [id]);

    // Get recent invoices
    const recentInvoices = await db.query(`
      SELECT
        i.*,
        v.vendor_name,
        v.vendor_type,
        u.name as added_by_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN users u ON i.added_by = u.user_id
      WHERE i.pod_id = ?
      ORDER BY i.created_at DESC
      LIMIT 10
    `, [id]);

    // Get statistics
    const stats = await db.query(`
      SELECT
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COUNT(DISTINCT vpa.vendor_id) as total_vendors,
        COALESCE(SUM(i.amount), 0) as total_invoice_amount,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN i.status = 'Pending' AND julianday(i.due_date) - julianday('now') <= 7 THEN 1 END) as due_soon_invoices
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN vendor_pod_allocations vpa ON v.vendor_id = vpa.vendor_id
      WHERE i.pod_id = ?
    `, [id]);

    pod.vendors = vendors;
    pod.budgetCategories = budgetCategories;
    pod.recentInvoices = recentInvoices;
    pod.stats = stats[0];

    res.json({ pod });

  } catch (error) {
    console.error('Get pod error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new pod
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      pod_name,
      description,
      company_id,
      owner_user_id,
      budget_ceiling,
      threshold_alert = 80,
      budget_categories = []
    } = req.body;

    if (!pod_name || !company_id || !owner_user_id || !budget_ceiling) {
      return res.status(400).json({
        error: 'Pod name, company, owner, and budget ceiling are required'
      });
    }

    // Verify company exists
    const companies = await db.query(
      'SELECT company_id FROM companies WHERE company_id = ? AND status = ?',
      [company_id, 'Active']
    );

    if (companies.length === 0) {
      return res.status(400).json({ error: 'Invalid company' });
    }

    const podId = uuidv4();

    // Create pod
    await db.runQuery(`
      INSERT INTO pods (pod_id, pod_name, description, company_id, owner_user_id,
                        budget_ceiling, threshold_alert)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [podId, pod_name, description, company_id, owner_user_id, budget_ceiling, threshold_alert]);

    // Create budget categories if provided
    if (budget_categories.length > 0) {
      for (const category of budget_categories) {
        const categoryId = uuidv4();
        await db.runQuery(`
          INSERT INTO budget_categories (category_id, pod_id, category_name, allocated_amount)
          VALUES (?, ?, ?, ?)
        `, [categoryId, podId, category.category_name, category.allocated_amount]);
      }
    }

    res.status(201).json({
      message: 'Pod created successfully',
      pod_id: podId
    });

  } catch (error) {
    console.error('Create pod error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update pod
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pod_name,
      description,
      owner_user_id,
      budget_ceiling,
      threshold_alert,
      status
    } = req.body;

    // Check if pod exists
    const pods = await db.query('SELECT pod_id FROM pods WHERE pod_id = ?', [id]);
    if (pods.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    if (status && !['Active', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.runQuery(`
      UPDATE pods
      SET pod_name = COALESCE(?, pod_name),
          description = COALESCE(?, description),
          owner_user_id = COALESCE(?, owner_user_id),
          budget_ceiling = COALESCE(?, budget_ceiling),
          threshold_alert = COALESCE(?, threshold_alert),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE pod_id = ?
    `, [pod_name, description, owner_user_id, budget_ceiling, threshold_alert, status, id]);

    res.json({ message: 'Pod updated successfully' });

  } catch (error) {
    console.error('Update pod error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete pod (soft delete - archive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pod exists
    const pods = await db.query('SELECT pod_id FROM pods WHERE pod_id = ?', [id]);
    if (pods.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    // Archive pod
    await db.runQuery(
      'UPDATE pods SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE pod_id = ?',
      ['Archived', id]
    );

    res.json({ message: 'Pod archived successfully' });

  } catch (error) {
    console.error('Delete pod error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update pod budget (when invoice is paid)
router.put('/:id/budget', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Update pod budget used
    await db.runQuery(
      'UPDATE pods SET budget_used = budget_used + ?, updated_at = CURRENT_TIMESTAMP WHERE pod_id = ?',
      [amount, id]
    );

    res.json({ message: 'Pod budget updated successfully' });

  } catch (error) {
    console.error('Update pod budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pod dashboard data
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
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

    const dashboard = await db.query(`
      SELECT
        p.pod_id,
        p.pod_name,
        p.budget_ceiling,
        p.budget_used,
        p.budget_remaining,
        p.budget_status,
        p.threshold_alert,
        u.name as owner_name,
        c.company_name,
        COALESCE(COUNT(DISTINCT i.invoice_id), 0) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_spend,
        COALESCE(COUNT(CASE WHEN i.status = 'Pending' THEN 1 END), 0) as pending_invoices,
        COALESCE(COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END), 0) as overdue_invoices,
        COALESCE(COUNT(CASE WHEN i.status = 'Pending' AND julianday(i.due_date) - julianday('now') <= 7 THEN 1 END), 0) as due_soon_invoices,
        ROUND((p.budget_used / p.budget_ceiling) * 100, 2) as utilization_percentage
      FROM pods p
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      WHERE p.pod_id = ? AND p.status = 'Active'
      ${dateCondition}
      GROUP BY p.pod_id
    `, [id]);

    if (dashboard.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    // Vendor-wise spending
    const vendorSpending = await db.query(`
      SELECT
        v.vendor_name,
        v.vendor_type,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        ROUND(AVG(i.amount), 2) as average_amount
      FROM vendor_pod_allocations vpa
      LEFT JOIN vendors v ON vpa.vendor_id = v.vendor_id
      LEFT JOIN invoices i ON v.vendor_id = i.vendor_id AND i.pod_id = ?
      WHERE vpa.pod_id = ?
      GROUP BY v.vendor_id
      ORDER BY total_amount DESC
    `, [id, id]);

    // Monthly trend
    const monthlyTrend = await db.query(`
      SELECT
        substr(i.invoice_month, 1, 4) as year,
        substr(i.invoice_month, 6, 2) as month,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount
      FROM invoices i
      WHERE i.pod_id = ?
      GROUP BY i.invoice_month
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [id]);

    // Upcoming payments
    const upcomingPayments = await db.query(`
      SELECT
        i.invoice_id,
        i.invoice_title,
        i.amount,
        i.due_date,
        v.vendor_name,
        CASE
          WHEN julianday(i.due_date) - julianday('now') < 0 THEN 'Overdue'
          WHEN julianday(i.due_date) - julianday('now') <= 7 THEN 'Due Soon'
          ELSE 'Scheduled'
        END as urgency_status
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE i.pod_id = ? AND i.status != 'Paid'
      ORDER BY i.due_date ASC
      LIMIT 10
    `, [id]);

    res.json({
      summary: dashboard[0],
      vendorSpending,
      monthlyTrend,
      upcomingPayments
    });

  } catch (error) {
    console.error('Pod dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;