const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'payments');
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

// Get all payments (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      pod_id,
      vendor_id,
      payment_method,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT
        p.*,
        i.invoice_title,
        i.invoice_month,
        v.vendor_name,
        v.vendor_type,
        pod.pod_name,
        pod.company_id,
        c.company_name,
        u.name as recorded_by_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.invoice_id
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN pods pod ON p.pod_id = pod.pod_id
      LEFT JOIN companies c ON pod.company_id = c.company_id
      LEFT JOIN users u ON p.recorded_by = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (pod_id) {
      query += ' AND p.pod_id = ?';
      params.push(pod_id);
    }

    if (vendor_id) {
      query += ' AND p.vendor_id = ?';
      params.push(vendor_id);
    }

    if (payment_method) {
      query += ' AND p.payment_method = ?';
      params.push(payment_method);
    }

    if (start_date) {
      query += ' AND p.payment_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND p.payment_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY p.payment_date DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const payments = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM payments p WHERE 1=1';
    const countParams = [];

    if (pod_id) {
      countQuery += ' AND p.pod_id = ?';
      countParams.push(pod_id);
    }
    if (vendor_id) {
      countQuery += ' AND p.vendor_id = ?';
      countParams.push(vendor_id);
    }
    if (payment_method) {
      countQuery += ' AND p.payment_method = ?';
      countParams.push(payment_method);
    }
    if (start_date) {
      countQuery += ' AND p.payment_date >= ?';
      countParams.push(start_date);
    }
    if (end_date) {
      countQuery += ' AND p.payment_date <= ?';
      countParams.push(end_date);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single payment with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const payments = await db.query(`
      SELECT
        p.*,
        i.invoice_title,
        i.invoice_month,
        i.amount as invoice_amount,
        v.vendor_name,
        v.vendor_type,
        v.poc_email,
        pod.pod_name,
        pod.company_id,
        c.company_name,
        u.name as recorded_by_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.invoice_id
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN pods pod ON p.pod_id = pod.pod_id
      LEFT JOIN companies c ON pod.company_id = c.company_id
      LEFT JOIN users u ON p.recorded_by = u.user_id
      WHERE p.payment_id = ?
    `, [id]);

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment: payments[0] });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new payment
router.post('/', authenticateToken, upload.single('payment_proof'), async (req, res) => {
  try {
    const {
      invoice_id,
      payment_date,
      payment_amount,
      payment_method,
      reference_number,
      remarks
    } = req.body;

    if (!invoice_id || !payment_date || !payment_amount || !payment_method) {
      return res.status(400).json({
        error: 'Invoice ID, payment date, amount, and method are required'
      });
    }

    if (!['Bank Transfer', 'Credit Card', 'UPI', 'Cheque', 'Other'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check if invoice exists and is not already paid
    const invoices = await db.query(`
      SELECT i.*, v.vendor_name, p.pod_id, p.pod_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE i.invoice_id = ?
    `, [invoice_id]);

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];

    if (invoice.status === 'Paid') {
      return res.status(400).json({ error: 'Invoice is already marked as paid' });
    }

    // Check if payment already exists for this invoice
    const existingPayments = await db.query('SELECT payment_id FROM payments WHERE invoice_id = ?', [invoice_id]);
    if (existingPayments.length > 0) {
      return res.status(400).json({ error: 'Payment already recorded for this invoice' });
    }

    const paymentId = uuidv4();
    const paymentProofUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;

    // Create payment record
    await db.runQuery(`
      INSERT INTO payments (
        payment_id, invoice_id, vendor_id, pod_id, payment_date,
        payment_amount, payment_method, reference_number,
        payment_proof_url, recorded_by, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paymentId, invoice_id, invoice.vendor_id, invoice.pod_id, payment_date,
      payment_amount, payment_method, reference_number,
      paymentProofUrl, req.user.userId, remarks
    ]);

    // Update invoice status to Paid
    await db.runQuery(
      'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?',
      ['Paid', invoice_id]
    );

    // Update pod budget
    await db.runQuery(
      'UPDATE pods SET budget_used = budget_used + ?, updated_at = CURRENT_TIMESTAMP WHERE pod_id = ?',
      [payment_amount, invoice.pod_id]
    );

    // Resolve related alerts
    await db.runQuery(
      'UPDATE alerts SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE related_invoice_id = ? AND status = ?',
      ['Resolved', invoice_id, 'Active']
    );

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment_id: paymentId
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment
router.put('/:id', authenticateToken, upload.single('payment_proof'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      payment_date,
      payment_amount,
      payment_method,
      reference_number,
      remarks
    } = req.body;

    // Check if payment exists
    const payments = await db.query('SELECT * FROM payments WHERE payment_id = ?', [id]);
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const oldPayment = payments[0];

    if (payment_method && !['Bank Transfer', 'Credit Card', 'UPI', 'Cheque', 'Other'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    let paymentProofUrl = oldPayment.payment_proof_url;
    if (req.file) {
      paymentProofUrl = `/uploads/payments/${req.file.filename}`;
      // Delete old proof if exists
      if (oldPayment.payment_proof_url) {
        const oldPath = path.join(__dirname, '..', oldPayment.payment_proof_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Update payment
    await db.runQuery(`
      UPDATE payments
      SET payment_date = COALESCE(?, payment_date),
          payment_amount = COALESCE(?, payment_amount),
          payment_method = COALESCE(?, payment_method),
          reference_number = COALESCE(?, reference_number),
          payment_proof_url = COALESCE(?, payment_proof_url),
          remarks = COALESCE(?, remarks),
          updated_at = CURRENT_TIMESTAMP
      WHERE payment_id = ?
    `, [
      payment_date, payment_amount, payment_method,
      reference_number, paymentProofUrl, remarks, id
    ]);

    // Update pod budget if amount changed
    if (payment_amount && payment_amount !== oldPayment.payment_amount) {
      const difference = payment_amount - oldPayment.payment_amount;
      await db.runQuery(
        'UPDATE pods SET budget_used = budget_used + ? WHERE pod_id = ?',
        [difference, oldPayment.pod_id]
      );
    }

    res.json({ message: 'Payment updated successfully' });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if payment exists
    const payments = await db.query('SELECT * FROM payments WHERE payment_id = ?', [id]);
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Delete payment proof file if exists
    if (payment.payment_proof_url) {
      const filePath = path.join(__dirname, '..', payment.payment_proof_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete payment
    await db.runQuery('DELETE FROM payments WHERE payment_id = ?', [id]);

    // Update invoice status back to Pending
    await db.runQuery(
      'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?',
      ['Pending', payment.invoice_id]
    );

    // Update pod budget
    await db.runQuery(
      'UPDATE pods SET budget_used = budget_used - ? WHERE pod_id = ?',
      [payment.payment_amount, payment.pod_id]
    );

    // Reactivate related alerts
    await db.runQuery(
      'UPDATE alerts SET status = ?, resolved_at = NULL WHERE related_invoice_id = ? AND status = ?',
      ['Active', payment.invoice_id, 'Resolved']
    );

    res.json({ message: 'Payment deleted successfully' });

  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { pod_id, company_id, period = 'current_month' } = req.query;

    let dateCondition = '';
    let podCondition = '';

    const now = new Date();
    if (period === 'current_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateCondition = `AND p.payment_date >= '${startOfMonth.toISOString().split('T')[0]}'`;
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dateCondition = `AND p.payment_date >= '${startOfLastMonth.toISOString().split('T')[0]}' AND p.payment_date <= '${endOfLastMonth.toISOString().split('T')[0]}'`;
    }

    if (pod_id) {
      podCondition = 'AND p.pod_id = ?';
    } else if (company_id) {
      podCondition = 'AND pod.company_id = ?';
    }

    const stats = await db.query(`
      SELECT
        COUNT(p.payment_id) as total_payments,
        COALESCE(SUM(p.payment_amount), 0) as total_amount_paid,
        COALESCE(AVG(p.payment_amount), 0) as average_payment_amount,
        COUNT(CASE WHEN p.payment_method = 'Bank Transfer' THEN 1 END) as bank_transfer_count,
        COUNT(CASE WHEN p.payment_method = 'Credit Card' THEN 1 END) as credit_card_count,
        COUNT(CASE WHEN p.payment_method = 'UPI' THEN 1 END) as upi_count,
        COUNT(CASE WHEN p.payment_method = 'Cheque' THEN 1 END) as cheque_count,
        COUNT(CASE WHEN p.payment_method = 'Other' THEN 1 END) as other_count
      FROM payments p
      LEFT JOIN pods pod ON p.pod_id = pod.pod_id
      WHERE 1=1 ${dateCondition} ${podCondition}
    `, pod_id ? [pod_id] : company_id ? [company_id] : []);

    // Monthly payment trend
    const monthlyTrend = await db.query(`
      SELECT
        substr(p.payment_date, 1, 7) as month,
        COUNT(p.payment_id) as payment_count,
        COALESCE(SUM(p.payment_amount), 0) as total_amount
      FROM payments p
      LEFT JOIN pods pod ON p.pod_id = pod.pod_id
      WHERE 1=1 ${podCondition}
      GROUP BY substr(p.payment_date, 1, 7)
      ORDER BY month DESC
      LIMIT 12
    `, pod_id ? [pod_id] : company_id ? [company_id] : []);

    res.json({
      stats: stats[0],
      monthlyTrend
    });

  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;