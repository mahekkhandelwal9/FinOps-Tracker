const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, JPEG, PNG files are allowed.'));
    }
  }
});

// Get all invoices (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      pod_id,
      vendor_id,
      status,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT
        i.*,
        v.vendor_name,
        v.vendor_type,
        p.pod_name,
        p.company_id,
        c.company_name,
        u.name as added_by_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN users u ON i.added_by = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (pod_id) {
      query += ' AND i.pod_id = ?';
      params.push(pod_id);
    }

    if (vendor_id) {
      query += ' AND i.vendor_id = ?';
      params.push(vendor_id);
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (start_date) {
      query += ' AND i.invoice_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND i.invoice_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY i.invoice_date DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const invoices = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM invoices i
      WHERE 1=1
    `;

    const countParams = [];
    if (pod_id) {
      countQuery += ' AND i.pod_id = ?';
      countParams.push(pod_id);
    }
    if (vendor_id) {
      countQuery += ' AND i.vendor_id = ?';
      countParams.push(vendor_id);
    }
    if (status) {
      countQuery += ' AND i.status = ?';
      countParams.push(status);
    }
    if (start_date) {
      countQuery += ' AND i.invoice_date >= ?';
      countParams.push(start_date);
    }
    if (end_date) {
      countQuery += ' AND i.invoice_date <= ?';
      countParams.push(end_date);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single invoice with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const invoices = await db.query(`
      SELECT
        i.*,
        v.vendor_name,
        v.vendor_type,
        v.poc_email,
        v.payment_terms,
        p.pod_name,
        p.company_id,
        c.company_name,
        u.name as added_by_name,
        up.name as updated_by_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN users u ON i.added_by = u.user_id
      LEFT JOIN users up ON i.updated_by = up.user_id
      WHERE i.invoice_id = ?
    `, [id]);

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Get payment details if paid
    if (invoice.status === 'Paid') {
      const payments = await db.query(`
        SELECT
          p.*,
          u.name as recorded_by_name
        FROM payments p
        LEFT JOIN users u ON p.recorded_by = u.user_id
        WHERE p.invoice_id = ?
      `, [id]);

      invoice.payment = payments[0] || null;
    }

    res.json({ invoice });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new invoice
router.post('/', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const {
      invoice_title,
      vendor_id,
      pod_id,
      invoice_month,
      amount,
      invoice_date,
      due_date,
      notes
    } = req.body;

    if (!invoice_title || !vendor_id || !pod_id || !invoice_month || !amount || !invoice_date || !due_date) {
      return res.status(400).json({
        error: 'All required fields must be provided'
      });
    }

    // Validate vendor exists and is accessible by the pod
    const vendorAccess = await db.query(`
      SELECT v.vendor_id, v.vendor_name
      FROM vendors v
      LEFT JOIN vendor_pod_allocations vpa ON v.vendor_id = vpa.vendor_id
      WHERE v.vendor_id = ? AND (v.shared_status = 'Exclusive' OR vpa.pod_id = ?)
    `, [vendor_id, pod_id]);

    if (vendorAccess.length === 0) {
      return res.status(400).json({ error: 'Vendor not found or not accessible by this pod' });
    }

    // Check pod exists and get budget info
    const pods = await db.query('SELECT pod_id, budget_ceiling, budget_used FROM pods WHERE pod_id = ?', [pod_id]);
    if (pods.length === 0) {
      return res.status(400).json({ error: 'Pod not found' });
    }

    const pod = pods[0];
    const newBudgetUsed = pod.budget_used + parseFloat(amount);

    // Check if this would exceed the pod's budget
    if (newBudgetUsed > pod.budget_ceiling) {
      // Still allow the invoice but create a budget alert
      console.log(`Invoice would exceed pod budget: ${newBudgetUsed} > ${pod.budget_ceiling}`);
    }

    const invoiceId = uuidv4();
    const attachmentUrl = req.file ? `/uploads/invoices/${req.file.filename}` : null;

    // Create invoice
    await db.runQuery(`
      INSERT INTO invoices (
        invoice_id, invoice_title, vendor_id, pod_id, invoice_month,
        amount, invoice_date, due_date, attachment_url, notes, added_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceId, invoice_title, vendor_id, pod_id, invoice_month,
      amount, invoice_date, due_date, attachmentUrl, notes, req.user.userId
    ]);

    // Update invoice status based on due date
    const today = new Date();
    const dueDate = new Date(due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    let status = 'Pending';
    let reminderStatus = 'Scheduled';

    if (daysUntilDue < 0) {
      status = 'Overdue';
      reminderStatus = 'Escalated';
    } else if (daysUntilDue <= 7) {
      reminderStatus = 'Sent';
    }

    await db.runQuery(
      'UPDATE invoices SET status = ?, reminder_status = ? WHERE invoice_id = ?',
      [status, reminderStatus, invoiceId]
    );

    // Create alerts if needed
    if (status === 'Overdue' || reminderStatus === 'Sent') {
      const alertId = uuidv4();
      const alertMessage = status === 'Overdue'
        ? `Invoice for ${vendorAccess[0].vendor_name} (₹${amount}) is overdue by ${Math.abs(daysUntilDue)} days`
        : `Invoice for ${vendorAccess[0].vendor_name} (₹${amount}) is due in ${daysUntilDue} days`;

      await db.runQuery(`
        INSERT INTO alerts (
          alert_id, alert_type, related_invoice_id, related_pod_id,
          alert_message, severity, due_date, trigger_date, sent_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertId,
        status === 'Overdue' ? 'Invoice Overdue' : 'Invoice Due',
        invoiceId,
        pod_id,
        alertMessage,
        status === 'Overdue' ? 'High' : 'Medium',
        due_date,
        new Date().toISOString(),
        req.user.userId
      ]);
    }

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice_id: invoiceId,
      budget_warning: newBudgetUsed > pod.budget_ceiling ? 'Invoice exceeds pod budget' : null
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update invoice
router.put('/:id', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoice_title,
      vendor_id,
      pod_id,
      invoice_month,
      amount,
      invoice_date,
      due_date,
      status,
      notes
    } = req.body;

    // Check if invoice exists
    const invoices = await db.query('SELECT * FROM invoices WHERE invoice_id = ?', [id]);
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const oldInvoice = invoices[0];

    // Validate status
    if (status && !['Paid', 'Pending', 'Overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let attachmentUrl = oldInvoice.attachment_url;
    if (req.file) {
      attachmentUrl = `/uploads/invoices/${req.file.filename}`;
      // Delete old attachment if exists
      if (oldInvoice.attachment_url) {
        const oldPath = path.join(__dirname, '..', oldInvoice.attachment_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Update invoice
    await db.runQuery(`
      UPDATE invoices
      SET invoice_title = COALESCE(?, invoice_title),
          vendor_id = COALESCE(?, vendor_id),
          pod_id = COALESCE(?, pod_id),
          invoice_month = COALESCE(?, invoice_month),
          amount = COALESCE(?, amount),
          invoice_date = COALESCE(?, invoice_date),
          due_date = COALESCE(?, due_date),
          status = COALESCE(?, status),
          attachment_url = COALESCE(?, attachment_url),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE invoice_id = ?
    `, [
      invoice_title, vendor_id, pod_id, invoice_month,
      amount, invoice_date, due_date, status,
      attachmentUrl, notes, id
    ]);

    // Update pod budget if status changed to Paid
    if (status === 'Paid' && oldInvoice.status !== 'Paid') {
      await db.runQuery(
        'UPDATE pods SET budget_used = budget_used + ? WHERE pod_id = ?',
        [amount, pod_id]
      );
    } else if (status !== 'Paid' && oldInvoice.status === 'Paid') {
      await db.runQuery(
        'UPDATE pods SET budget_used = budget_used - ? WHERE pod_id = ?',
        [oldInvoice.amount, oldInvoice.pod_id]
      );
    }

    res.json({ message: 'Invoice updated successfully' });

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if invoice exists
    const invoices = await db.query('SELECT * FROM invoices WHERE invoice_id = ?', [id]);
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Don't allow deletion if payment exists
    const payments = await db.query('SELECT payment_id FROM payments WHERE invoice_id = ?', [id]);
    if (payments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete invoice with associated payment' });
    }

    // Update pod budget if invoice was marked as paid
    if (invoice.status === 'Paid') {
      await db.runQuery(
        'UPDATE pods SET budget_used = budget_used - ? WHERE pod_id = ?',
        [invoice.amount, invoice.pod_id]
      );
    }

    // Delete attachment file if exists
    if (invoice.attachment_url) {
      const filePath = path.join(__dirname, '..', invoice.attachment_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete invoice
    await db.runQuery('DELETE FROM invoices WHERE invoice_id = ?', [id]);

    // Delete related alerts
    await db.runQuery('DELETE FROM alerts WHERE related_invoice_id = ?', [id]);

    res.json({ message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { pod_id, company_id, period = 'current_month' } = req.query;

    let dateCondition = '';
    let podCondition = '';

    const now = new Date();
    if (period === 'current_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateCondition = `AND i.invoice_date >= '${startOfMonth.toISOString().split('T')[0]}'`;
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dateCondition = `AND i.invoice_date >= '${startOfLastMonth.toISOString().split('T')[0]}' AND i.invoice_date <= '${endOfLastMonth.toISOString().split('T')[0]}'`;
    }

    if (pod_id) {
      podCondition = 'AND i.pod_id = ?';
    } else if (company_id) {
      podCondition = 'AND p.company_id = ?';
    }

    const stats = await db.query(`
      SELECT
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN i.status = 'Paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN i.status = 'Pending' AND julianday(i.due_date) - julianday('now') <= 7 THEN 1 END) as due_soon_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'Pending' THEN i.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN i.status = 'Overdue' THEN i.amount ELSE 0 END), 0) as overdue_amount
      FROM invoices i
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE 1=1 ${dateCondition} ${podCondition}
    `, pod_id ? [pod_id] : company_id ? [company_id] : []);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Invoice stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;