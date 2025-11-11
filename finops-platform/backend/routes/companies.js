const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Get all companies with calculated fields
router.get('/', authenticateToken, async (req, res) => {
  try {
    const companies = await db.query(`
      SELECT c.*,
             u.name as created_by_name,
             COUNT(DISTINCT p.pod_id) as total_pods,
             COALESCE(SUM(p.budget_ceiling), 0) as total_allocated_budget,
             COALESCE(SUM(p.budget_used), 0) as total_spend,
             COALESCE(SUM(p.budget_used), 0) as total_budget_used,
             CASE
               WHEN COALESCE(SUM(p.budget_ceiling), 0) > 0
               THEN ROUND((COALESCE(SUM(p.budget_used), 0) / COALESCE(SUM(p.budget_ceiling), 0)) * 100, 2)
               ELSE 0
             END as budget_utilization_percentage
      FROM companies c
      LEFT JOIN users u ON c.created_by = u.user_id
      LEFT JOIN pods p ON c.company_id = p.company_id AND p.status = 'Active'
      GROUP BY c.company_id
      ORDER BY c.created_at DESC
    `);

    res.json({ companies });

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single company with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const companies = await db.query(`
      SELECT c.*, u.name as created_by_name
      FROM companies c
      LEFT JOIN users u ON c.created_by = u.user_id
      WHERE c.company_id = ?
    `, [id]);

    if (companies.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = companies[0];

    // Get pods for this company
    const pods = await db.query(`
      SELECT p.*, u.name as owner_name
      FROM pods p
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      WHERE p.company_id = ? AND p.status = 'Active'
      ORDER BY p.created_at DESC
    `, [id]);

    // Get summary statistics
    const stats = await db.query(`
      SELECT
        COUNT(DISTINCT p.pod_id) as total_pods,
        COUNT(DISTINCT v.vendor_id) as total_vendors,
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COALESCE(SUM(p.budget_ceiling), 0) as total_budget_allocated,
        COALESCE(SUM(p.budget_used), 0) as total_budget_used
      FROM companies c
      LEFT JOIN pods p ON c.company_id = p.company_id
      LEFT JOIN vendor_pod_allocations vpa ON p.pod_id = vpa.pod_id
      LEFT JOIN vendors v ON vpa.vendor_id = v.vendor_id
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      WHERE c.company_id = ? AND c.status = 'Active'
    `, [id]);

    company.pods = pods;
    company.stats = stats[0];

    res.json({ company });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new company
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { company_name, total_budget, financial_period, notes } = req.body;

    if (!company_name || !total_budget || !financial_period) {
      return res.status(400).json({ error: 'Company name, total budget, and financial period are required' });
    }

    if (!['Monthly', 'Quarterly', 'Yearly'].includes(financial_period)) {
      return res.status(400).json({ error: 'Invalid financial period' });
    }

    const companyId = uuidv4();

    await db.runQuery(`
      INSERT INTO companies (company_id, company_name, total_budget, financial_period, created_by, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [companyId, company_name, total_budget, financial_period, req.user.userId, notes]);

    res.status(201).json({
      message: 'Company created successfully',
      company_id: companyId
    });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Company name already exists' });
    }
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update company
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, total_budget, financial_period, status, notes, description } = req.body;

    // Check if company exists
    const companies = await db.query('SELECT company_id FROM companies WHERE company_id = ?', [id]);
    if (companies.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (financial_period && !['Monthly', 'Quarterly', 'Yearly'].includes(financial_period)) {
      return res.status(400).json({ error: 'Invalid financial period' });
    }

    if (status && !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.runQuery(`
      UPDATE companies
      SET company_name = COALESCE(?, company_name),
          total_budget = COALESCE(?, total_budget),
          financial_period = COALESCE(?, financial_period),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE company_id = ?
    `, [company_name, total_budget, financial_period, status, notes, description, id]);

    res.json({ message: 'Company updated successfully' });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Company name already exists' });
    }
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete company (soft delete - set status to inactive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if company exists
    const companies = await db.query('SELECT company_id FROM companies WHERE company_id = ?', [id]);
    if (companies.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Soft delete company
    await db.runQuery(
      'UPDATE companies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
      ['Inactive', id]
    );

    // Also archive associated pods
    await db.runQuery(
      'UPDATE pods SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
      ['Archived', id]
    );

    res.json({ message: 'Company deleted successfully' });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get company dashboard data
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'all_time' } = req.query; // Default to all_time to show all data

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
    } else if (period === 'all_time') {
      // Remove date filtering to get all-time data
      dateCondition = '';
    } else if (period === 'last_30_days') {
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      dateCondition = `AND i.invoice_date >= '${thirtyDaysAgo.toISOString().split('T')[0]}'`;
    }

    // Enhanced query for comprehensive dashboard data
    const dashboard = await db.query(`
      SELECT
        c.company_name,
        c.total_budget,
        c.currency,
        -- Pod calculations (all pods regardless of status for real-time data)
        COALESCE(SUM(p.budget_ceiling), 0) as allocated_budget,
        COALESCE(SUM(p.budget_used), 0) as budget_used_from_pods,
        COALESCE(COUNT(DISTINCT p.pod_id), 0) as total_pods,
        COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'Active' THEN p.pod_id END), 0) as active_pods,
        -- Invoice calculations (all invoices regardless of status)
        COALESCE(COUNT(DISTINCT i.invoice_id), 0) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_invoice_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Pending' THEN i.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Overdue' THEN i.amount ELSE 0 END), 0) as overdue_amount,
        -- Invoice counts by status
        COALESCE(COUNT(CASE WHEN i.status = 'Paid' THEN 1 END), 0) as paid_invoices,
        COALESCE(COUNT(CASE WHEN i.status = 'Pending' THEN 1 END), 0) as pending_invoices,
        COALESCE(COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END), 0) as overdue_invoices,
        COALESCE(COUNT(CASE WHEN i.status = 'Pending' AND julianday(i.due_date) - julianday('now') <= 7 THEN 1 END), 0) as due_soon_invoices,
        -- Vendor calculations
        COALESCE(COUNT(DISTINCT v.vendor_id), 0) as total_vendors,
        COALESCE(COUNT(DISTINCT vpa.vendor_id), 0) as allocated_vendors,
        -- Budget utilization percentage (based on pod budgets)
        CASE
          WHEN COALESCE(SUM(p.budget_ceiling), 0) > 0 THEN
            ROUND((COALESCE(SUM(p.budget_used), 0) / COALESCE(SUM(p.budget_ceiling), 0)) * 100, 2)
          ELSE 0
        END as budget_utilization_percentage,
        -- Invoice utilization percentage (based on total company budget) - this is what the user wants
        CASE
          WHEN c.total_budget > 0 THEN
            ROUND((COALESCE(SUM(i.amount), 0) / c.total_budget) * 100, 2)
          ELSE 0
        END as invoice_utilization_percentage,
        -- Payment tracking
        COALESCE(COUNT(DISTINCT pm.payment_id), 0) as total_payments,
        COALESCE(SUM(pm.payment_amount), 0) as total_payment_amount
      FROM companies c
      LEFT JOIN pods p ON c.company_id = p.company_id
      LEFT JOIN vendor_pod_allocations vpa ON p.pod_id = vpa.pod_id
      LEFT JOIN vendors v ON vpa.vendor_id = v.vendor_id
      LEFT JOIN invoices i ON p.pod_id = i.pod_id ${dateCondition}
      LEFT JOIN payments pm ON i.invoice_id = pm.invoice_id
      WHERE c.company_id = ?
      GROUP BY c.company_id, c.company_name, c.total_budget, c.currency
    `, [id]);

    // Pod-wise breakdown (all pods for real-time data)
    const podBreakdown = await db.query(`
      SELECT
        p.pod_id,
        p.pod_name,
        p.budget_ceiling,
        p.budget_used,
        p.budget_status,
        p.status as pod_status,
        u.name as owner_name,
        COALESCE(COUNT(DISTINCT i.invoice_id), 0) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_spend,
        CASE
          WHEN p.budget_ceiling > 0 THEN
            ROUND((p.budget_used / p.budget_ceiling) * 100, 2)
          ELSE 0
        END as utilization_percentage
      FROM pods p
      LEFT JOIN users u ON p.owner_user_id = u.user_id
      LEFT JOIN invoices i ON p.pod_id = i.pod_id ${dateCondition}
      WHERE p.company_id = ?
      GROUP BY p.pod_id
      ORDER BY p.budget_used DESC
    `, [id]);

    // Category-wise spending (all pods for real-time data)
    const categoryBreakdown = await db.query(`
      SELECT
        v.vendor_type,
        COALESCE(SUM(i.amount), 0) as total_spend,
        COALESCE(COUNT(DISTINCT i.invoice_id), 0) as invoice_count
      FROM pods p
      LEFT JOIN invoices i ON p.pod_id = i.pod_id
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE p.company_id = ?
      GROUP BY v.vendor_type
      ORDER BY total_spend DESC
    `, [id]);

    // Recent invoices
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
      WHERE p.company_id = ?
      ORDER BY i.created_at DESC
      LIMIT 10
    `, [id]);

    // Monthly spending trend
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
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE p.company_id = ?
      GROUP BY i.invoice_month
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [id]);

    res.json({
      summary: dashboard[0],
      podBreakdown,
      categoryBreakdown,
      recentInvoices,
      monthlyTrend
    });

  } catch (error) {
    console.error('Company dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get company notes (including deleted notes with deletion info)
router.get('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notes = await db.query(`
      SELECT cn.*,
             u.name as created_by_name,
             du.name as deleted_by_name
      FROM company_notes cn
      LEFT JOIN users u ON cn.created_by = u.user_id
      LEFT JOIN users du ON cn.deleted_by = du.user_id
      WHERE cn.company_id = ?
      ORDER BY cn.created_at DESC
    `, [id]);

    res.json({ notes });

  } catch (error) {
    console.error('Get company notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add company note
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { note_text } = req.body;

    console.log('🔍 Adding note - Company ID:', id);
    console.log('🔍 Adding note - Note text:', note_text);
    console.log('🔍 Adding note - User ID:', req.user.userId);

    if (!note_text || note_text.trim() === '') {
      return res.status(400).json({ error: 'Note text is required' });
    }

    // Check if company exists
    const companies = await db.query('SELECT company_id FROM companies WHERE company_id = ?', [id]);
    console.log('🔍 Adding note - Company exists check:', companies.length > 0);
    if (companies.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const noteId = uuidv4();
    console.log('🔍 Adding note - Generated note ID:', noteId);

    const result = await db.runQuery(`
      INSERT INTO company_notes (note_id, company_id, note_text, created_by)
      VALUES (?, ?, ?, ?)
    `, [noteId, id, note_text.trim(), req.user.userId]);

    console.log('🔍 Adding note - DB result:', result);

    // Verify the note was actually inserted
    const verifyNote = await db.query('SELECT * FROM company_notes WHERE note_id = ?', [noteId]);
    console.log('🔍 Adding note - Verification check:', verifyNote.length > 0 ? 'SUCCESS' : 'FAILED');
    if (verifyNote.length > 0) {
      console.log('🔍 Added note data:', verifyNote[0]);
    }

    res.status(201).json({
      message: 'Note added successfully',
      note_id: noteId
    });

  } catch (error) {
    console.error('🔥 Add company note error:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        console.error('🔥 Foreign key constraint failed - User ID:', req.user.userId, 'Company ID:', id);
        return res.status(400).json({ error: 'Invalid user or company reference' });
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update company note
router.put('/:id/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { id, noteId } = req.params;
    const { note_text } = req.body;

    if (!note_text || note_text.trim() === '') {
      return res.status(400).json({ error: 'Note text is required' });
    }

    // Check if note exists and belongs to company
    const notes = await db.query(
      'SELECT note_id FROM company_notes WHERE note_id = ? AND company_id = ?',
      [noteId, id]
    );

    if (notes.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await db.runQuery(`
      UPDATE company_notes
      SET note_text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE note_id = ? AND company_id = ?
    `, [note_text.trim(), noteId, id]);

    res.json({ message: 'Note updated successfully' });

  } catch (error) {
    console.error('Update company note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete company note (soft delete with tracking)
router.delete('/:id/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { id, noteId } = req.params;

    console.log('🔍 Deleting note - Company ID:', id);
    console.log('🔍 Deleting note - Note ID:', noteId);
    console.log('🔍 Deleting note - User ID:', req.user.userId);

    // Check if note exists and belongs to company
    const notes = await db.query(
      'SELECT * FROM company_notes WHERE note_id = ? AND company_id = ? AND deleted_at IS NULL',
      [noteId, id]
    );

    console.log('🔍 Deleting note - Note exists check:', notes.length > 0);
    if (notes.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log('🔍 Deleting note - Note to delete:', notes[0]);

    // Soft delete with tracking
    const result = await db.runQuery(`
      UPDATE company_notes
      SET deleted_by = ?, deleted_at = CURRENT_TIMESTAMP
      WHERE note_id = ? AND company_id = ?
    `, [req.user.userId, noteId, id]);

    console.log('🔍 Deleting note - DB result:', result);

    // Verify the soft delete worked
    const verifyDelete = await db.query(
      'SELECT * FROM company_notes WHERE note_id = ? AND company_id = ?',
      [noteId, id]
    );
    console.log('🔍 Deleting note - Post-delete verification:', verifyDelete.length > 0 ? 'FOUND' : 'NOT FOUND');
    if (verifyDelete.length > 0) {
      console.log('🔍 Deleted note data:', verifyDelete[0]);
    }

    res.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('🔥 Delete company note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;