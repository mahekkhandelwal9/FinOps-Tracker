const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Get all alerts (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      company_id,
      pod_id,
      alert_type,
      severity,
      status,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT
        a.*,
        p.pod_name,
        c.company_name,
        i.invoice_title,
        i.amount as invoice_amount,
        v.vendor_name
      FROM alerts a
      LEFT JOIN pods p ON a.related_pod_id = p.pod_id
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN invoices i ON a.related_invoice_id = i.invoice_id
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE 1=1
    `;

    const params = [];

    if (company_id) {
      query += ' AND p.company_id = ?';
      params.push(company_id);
    }

    if (pod_id) {
      query += ' AND a.related_pod_id = ?';
      params.push(pod_id);
    }

    if (alert_type) {
      query += ' AND a.alert_type = ?';
      params.push(alert_type);
    }

    if (severity) {
      query += ' AND a.severity = ?';
      params.push(severity);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const alerts = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM alerts a
      LEFT JOIN pods p ON a.related_pod_id = p.pod_id
      WHERE 1=1
    `;

    const countParams = [];
    if (company_id) {
      countQuery += ' AND p.company_id = ?';
      countParams.push(company_id);
    }
    if (pod_id) {
      countQuery += ' AND a.related_pod_id = ?';
      countParams.push(pod_id);
    }
    if (alert_type) {
      countQuery += ' AND a.alert_type = ?';
      countParams.push(alert_type);
    }
    if (severity) {
      countQuery += ' AND a.severity = ?';
      countParams.push(severity);
    }
    if (status) {
      countQuery += ' AND a.status = ?';
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single alert
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const alerts = await db.query(`
      SELECT
        a.*,
        p.pod_name,
        p.company_id,
        c.company_name,
        i.invoice_title,
        i.amount as invoice_amount,
        i.due_date as invoice_due_date,
        v.vendor_name,
        u.name as sent_to_name
      FROM alerts a
      LEFT JOIN pods p ON a.related_pod_id = p.pod_id
      LEFT JOIN companies c ON p.company_id = c.company_id
      LEFT JOIN invoices i ON a.related_invoice_id = i.invoice_id
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN users u ON a.sent_to = u.user_id
      WHERE a.alert_id = ?
    `, [id]);

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert: alerts[0] });

  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create manual alert
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      alert_type,
      related_pod_id,
      related_invoice_id,
      alert_message,
      severity,
      due_date,
      sent_to
    } = req.body;

    if (!alert_type || !alert_message || !severity || !sent_to) {
      return res.status(400).json({
        error: 'Alert type, message, severity, and recipient are required'
      });
    }

    if (!['Invoice Due', 'Invoice Overdue', 'Budget Threshold', 'Manual'].includes(alert_type)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    if (!['Low', 'Medium', 'High'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity level' });
    }

    const alertId = uuidv4();

    await db.runQuery(`
      INSERT INTO alerts (
        alert_id, alert_type, related_invoice_id, related_pod_id,
        alert_message, severity, due_date, trigger_date, sent_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      alertId, alert_type, related_invoice_id, related_pod_id,
      alert_message, severity, due_date, new Date().toISOString(), sent_to
    ]);

    res.status(201).json({
      message: 'Alert created successfully',
      alert_id: alertId
    });

  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update alert status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Acknowledged', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if alert exists
    const alerts = await db.query('SELECT alert_id FROM alerts WHERE alert_id = ?', [id]);
    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const resolvedAt = status === 'Resolved' ? new Date().toISOString() : null;

    await db.runQuery(
      'UPDATE alerts SET status = ?, resolved_at = ? WHERE alert_id = ?',
      [status, resolvedAt, id]
    );

    res.json({ message: 'Alert status updated successfully' });

  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete alert
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if alert exists
    const alerts = await db.query('SELECT alert_id FROM alerts WHERE alert_id = ?', [id]);
    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await db.runQuery('DELETE FROM alerts WHERE alert_id = ?', [id]);

    res.json({ message: 'Alert deleted successfully' });

  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alert summary
router.get('/summary/overview', authenticateToken, async (req, res) => {
  try {
    const { company_id, pod_id } = req.query;

    let podCondition = '';
    const params = [];

    if (pod_id) {
      podCondition = ' AND a.related_pod_id = ?';
      params.push(pod_id);
    } else if (company_id) {
      podCondition = ' AND p.company_id = ?';
      params.push(company_id);
    }

    const summary = await db.query(`
      SELECT
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN a.status = 'Active' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN a.status = 'Acknowledged' THEN 1 END) as acknowledged_alerts,
        COUNT(CASE WHEN a.status = 'Resolved' THEN 1 END) as resolved_alerts,
        COUNT(CASE WHEN a.alert_type = 'Invoice Due' THEN 1 END) as invoice_due_alerts,
        COUNT(CASE WHEN a.alert_type = 'Invoice Overdue' THEN 1 END) as overdue_alerts,
        COUNT(CASE WHEN a.alert_type = 'Budget Threshold' THEN 1 END) as budget_alerts,
        COUNT(CASE WHEN a.severity = 'High' THEN 1 END) as high_priority,
        COUNT(CASE WHEN a.severity = 'Medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN a.severity = 'Low' THEN 1 END) as low_priority
      FROM alerts a
      LEFT JOIN pods p ON a.related_pod_id = p.pod_id
      WHERE 1=1 ${podCondition}
    `, params);

    // Recent alerts
    const recentAlerts = await db.query(`
      SELECT
        a.alert_id,
        a.alert_type,
        a.alert_message,
        a.severity,
        a.status,
        a.created_at,
        p.pod_name,
        v.vendor_name,
        i.invoice_title
      FROM alerts a
      LEFT JOIN pods p ON a.related_pod_id = p.pod_id
      LEFT JOIN vendors v ON v.vendor_id = (SELECT vendor_id FROM invoices WHERE invoice_id = a.related_invoice_id)
      LEFT JOIN invoices i ON a.related_invoice_id = i.invoice_id
      WHERE 1=1 ${podCondition}
      ORDER BY a.created_at DESC
      LIMIT 10
    `, params);

    res.json({
      summary: summary[0],
      recentAlerts
    });

  } catch (error) {
    console.error('Alert summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate system alerts (automated task)
router.post('/generate-system-alerts', authenticateToken, async (req, res) => {
  try {
    const { company_id } = req.body;

    let podCondition = '';
    const params = [];
    if (company_id) {
      podCondition = ' AND p.company_id = ?';
      params.push(company_id);
    }

    // Find invoices due in next 7 days
    const dueSoonInvoices = await db.query(`
      SELECT
        i.invoice_id,
        i.invoice_title,
        i.amount,
        i.due_date,
        i.pod_id,
        v.vendor_name,
        p.pod_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE i.status != 'Paid'
        AND julianday(i.due_date) - julianday('now') BETWEEN 0 AND 7
        AND i.invoice_id NOT IN (
          SELECT related_invoice_id FROM alerts
          WHERE alert_type = 'Invoice Due' AND status = 'Active'
        )
        ${podCondition}
    `, params);

    // Find overdue invoices
    const overdueInvoices = await db.query(`
      SELECT
        i.invoice_id,
        i.invoice_title,
        i.amount,
        i.due_date,
        i.pod_id,
        v.vendor_name,
        p.pod_name
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      WHERE i.status != 'Paid'
        AND julianday(i.due_date) - julianday('now') < 0
        AND i.invoice_id NOT IN (
          SELECT related_invoice_id FROM alerts
          WHERE alert_type = 'Invoice Overdue' AND status = 'Active'
        )
        ${podCondition}
    `, params);

    // Find pods exceeding budget threshold
    const budgetThresholdPods = await db.query(`
      SELECT
        p.pod_id,
        p.pod_name,
        p.budget_ceiling,
        p.budget_used,
        p.threshold_alert
      FROM pods p
      WHERE (p.budget_used / p.budget_ceiling) * 100 >= p.threshold_alert
        AND p.pod_id NOT IN (
          SELECT related_pod_id FROM alerts
          WHERE alert_type = 'Budget Threshold' AND status = 'Active'
        )
        ${podCondition}
    `, params);

    let generatedAlerts = 0;

    // Create alerts for due soon invoices
    for (const invoice of dueSoonInvoices) {
      const alertId = uuidv4();
      const daysUntilDue = Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24));

      await db.runQuery(`
        INSERT INTO alerts (
          alert_id, alert_type, related_invoice_id, related_pod_id,
          alert_message, severity, due_date, trigger_date, sent_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertId,
        'Invoice Due',
        invoice.invoice_id,
        invoice.pod_id,
        `Invoice for ${invoice.vendor_name} (${invoice.invoice_title}) of ₹${invoice.amount} is due in ${daysUntilDue} days`,
        'Medium',
        invoice.due_date,
        new Date().toISOString(),
        req.user.userId
      ]);

      generatedAlerts++;
    }

    // Create alerts for overdue invoices
    for (const invoice of overdueInvoices) {
      const alertId = uuidv4();
      const daysOverdue = Math.abs(Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24)));

      await db.runQuery(`
        INSERT INTO alerts (
          alert_id, alert_type, related_invoice_id, related_pod_id,
          alert_message, severity, due_date, trigger_date, sent_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertId,
        'Invoice Overdue',
        invoice.invoice_id,
        invoice.pod_id,
        `Invoice for ${invoice.vendor_name} (${invoice.invoice_title}) of ₹${invoice.amount} is overdue by ${daysOverdue} days`,
        'High',
        invoice.due_date,
        new Date().toISOString(),
        req.user.userId
      ]);

      generatedAlerts++;
    }

    // Create alerts for budget threshold
    for (const pod of budgetThresholdPods) {
      const alertId = uuidv4();
      const utilizationPercentage = ((pod.budget_used / pod.budget_ceiling) * 100).toFixed(1);

      await db.runQuery(`
        INSERT INTO alerts (
          alert_id, alert_type, related_pod_id,
          alert_message, severity, trigger_date, sent_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        alertId,
        'Budget Threshold',
        pod.pod_id,
        `Pod ${pod.pod_name} has used ${utilizationPercentage}% of its budget (₹${pod.budget_used} of ₹${pod.budget_ceiling})`,
        'Medium',
        new Date().toISOString(),
        req.user.userId
      ]);

      generatedAlerts++;
    }

    res.json({
      message: 'System alerts generated successfully',
      generated_alerts: generatedAlerts,
      due_soon_invoices: dueSoonInvoices.length,
      overdue_invoices: overdueInvoices.length,
      budget_alerts: budgetThresholdPods.length
    });

  } catch (error) {
    console.error('Generate system alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;