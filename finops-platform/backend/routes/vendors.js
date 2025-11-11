const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');
const db = require('../config/database');

const router = express.Router();

// Get all vendors (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { pod_id, vendor_type, shared_status } = req.query;

    let query = `
      SELECT DISTINCT v.*,
             COUNT(DISTINCT vpa.pod_id) as pod_count,
             GROUP_CONCAT(p.pod_name, ', ') as pod_names
      FROM vendors v
      LEFT JOIN vendor_pod_allocations vpa ON v.vendor_id = vpa.vendor_id
      LEFT JOIN pods p ON vpa.pod_id = p.pod_id
      WHERE v.status = 'Active'
    `;

    const params = [];

    if (pod_id) {
      query += ' AND vpa.pod_id = ?';
      params.push(pod_id);
    }

    if (vendor_type) {
      query += ' AND v.vendor_type = ?';
      params.push(vendor_type);
    }

    if (shared_status) {
      query += ' AND v.shared_status = ?';
      params.push(shared_status);
    }

    query += ' GROUP BY v.vendor_id ORDER BY v.vendor_name';

    const vendors = await db.query(query, params);
    res.json({ vendors });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single vendor with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const vendors = await db.query('SELECT * FROM vendors WHERE vendor_id = ?', [id]);

    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendors[0];

    // Get pod allocations
    const allocations = await db.query(`
      SELECT
        vpa.*,
        p.pod_name,
        p.company_id,
        c.company_name
      FROM vendor_pod_allocations vpa
      LEFT JOIN pods p ON vpa.pod_id = p.pod_id
      LEFT JOIN companies c ON p.company_id = c.company_id
      WHERE vpa.vendor_id = ?
      ORDER BY p.pod_name
    `, [id]);

    // Get invoices for this vendor
    const invoices = await db.query(`
      SELECT
        i.*,
        p.pod_name,
        u.name as added_by_name
      FROM invoices i
      LEFT JOIN pods p ON i.pod_id = p.pod_id
      LEFT JOIN users u ON i.added_by = u.user_id
      WHERE i.vendor_id = ?
      ORDER BY i.invoice_date DESC
    `, [id]);

    // Get spending statistics
    const stats = await db.query(`
      SELECT
        COUNT(i.invoice_id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COALESCE(AVG(i.amount), 0) as average_amount,
        MIN(i.invoice_date) as first_invoice_date,
        MAX(i.invoice_date) as last_invoice_date,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN i.status = 'Overdue' THEN 1 END) as overdue_invoices
      FROM invoices i
      WHERE i.vendor_id = ?
    `, [id]);

    // Monthly spending trend
    const monthlyTrend = await db.query(`
      SELECT
        substr(i.invoice_month, 1, 4) as year,
        substr(i.invoice_month, 6, 2) as month,
        i.invoice_month,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount
      FROM invoices i
      WHERE i.vendor_id = ?
      GROUP BY i.invoice_month
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [id]);

    vendor.allocations = allocations;
    vendor.invoices = invoices;
    vendor.stats = stats[0];
    vendor.monthlyTrend = monthlyTrend;

    res.json({ vendor });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new vendor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      vendor_name,
      vendor_type,
      shared_status = 'Exclusive',
      payment_terms,
      default_due_days,
      poc_name,
      poc_email,
      poc_phone,
      contract_start_date,
      contract_end_date,
      notes,
      pod_allocations = []
    } = req.body;

    if (!vendor_name || !vendor_type) {
      return res.status(400).json({ error: 'Vendor name and type are required' });
    }

    if (!['Cloud', 'SaaS', 'Staff Augmentation', 'Other'].includes(vendor_type)) {
      return res.status(400).json({ error: 'Invalid vendor type' });
    }

    if (!['Exclusive', 'Shared'].includes(shared_status)) {
      return res.status(400).json({ error: 'Invalid shared status' });
    }

    // If shared, must have pod allocations
    if (shared_status === 'Shared' && pod_allocations.length === 0) {
      return res.status(400).json({ error: 'Shared vendors must have pod allocations' });
    }

    const vendorId = uuidv4();

    // Create vendor
    await db.runQuery(`
      INSERT INTO vendors (
        vendor_id, vendor_name, vendor_type, shared_status, payment_terms,
        default_due_days, poc_name, poc_email, poc_phone,
        contract_start_date, contract_end_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vendorId, vendor_name, vendor_type, shared_status, payment_terms,
      default_due_days, poc_name, poc_email, poc_phone,
      contract_start_date, contract_end_date, notes
    ]);

    // Create pod allocations if provided
    if (pod_allocations.length > 0) {
      for (const allocation of pod_allocations) {
        const allocationId = uuidv4();

        // Verify pod exists
        const pods = await db.query('SELECT pod_id FROM pods WHERE pod_id = ?', [allocation.pod_id]);
        if (pods.length === 0) {
          continue; // Skip invalid pods
        }

        await db.runQuery(`
          INSERT INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage)
          VALUES (?, ?, ?, ?)
        `, [allocationId, vendorId, allocation.pod_id, allocation.allocation_percentage]);
      }
    }

    res.status(201).json({
      message: 'Vendor created successfully',
      vendor_id: vendorId
    });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Vendor name already exists' });
    }
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vendor
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_name,
      vendor_type,
      shared_status,
      payment_terms,
      default_due_days,
      poc_name,
      poc_email,
      poc_phone,
      contract_start_date,
      contract_end_date,
      status,
      notes
    } = req.body;

    // Check if vendor exists
    const vendors = await db.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [id]);
    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor_type && !['Cloud', 'SaaS', 'Staff Augmentation', 'Other'].includes(vendor_type)) {
      return res.status(400).json({ error: 'Invalid vendor type' });
    }

    if (shared_status && !['Exclusive', 'Shared'].includes(shared_status)) {
      return res.status(400).json({ error: 'Invalid shared status' });
    }

    if (status && !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.runQuery(`
      UPDATE vendors
      SET vendor_name = COALESCE(?, vendor_name),
          vendor_type = COALESCE(?, vendor_type),
          shared_status = COALESCE(?, shared_status),
          payment_terms = COALESCE(?, payment_terms),
          default_due_days = COALESCE(?, default_due_days),
          poc_name = COALESCE(?, poc_name),
          poc_email = COALESCE(?, poc_email),
          poc_phone = COALESCE(?, poc_phone),
          contract_start_date = COALESCE(?, contract_start_date),
          contract_end_date = COALESCE(?, contract_end_date),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE vendor_id = ?
    `, [
      vendor_name, vendor_type, shared_status, payment_terms,
      default_due_days, poc_name, poc_email, poc_phone,
      contract_start_date, contract_end_date, status, notes, id
    ]);

    res.json({ message: 'Vendor updated successfully' });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Vendor name already exists' });
    }
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vendor (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vendor exists
    const vendors = await db.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [id]);
    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if vendor has pending invoices
    const pendingInvoices = await db.query(
      'SELECT COUNT(*) as count FROM invoices WHERE vendor_id = ? AND status != ?',
      [id, 'Paid']
    );

    if (pendingInvoices[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete vendor with pending invoices' });
    }

    // Soft delete vendor
    await db.runQuery(
      'UPDATE vendors SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE vendor_id = ?',
      ['Inactive', id]
    );

    res.json({ message: 'Vendor deleted successfully' });

  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add or update pod allocation for vendor
router.put('/:id/allocations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { pod_id, allocation_percentage } = req.body;

    if (!pod_id || !allocation_percentage) {
      return res.status(400).json({ error: 'Pod ID and allocation percentage are required' });
    }

    if (allocation_percentage <= 0 || allocation_percentage > 100) {
      return res.status(400).json({ error: 'Allocation percentage must be between 1 and 100' });
    }

    // Check if vendor exists
    const vendors = await db.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [id]);
    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if pod exists
    const pods = await db.query('SELECT pod_id FROM pods WHERE pod_id = ?', [pod_id]);
    if (pods.length === 0) {
      return res.status(400).json({ error: 'Pod not found' });
    }

    // Check if allocation already exists
    const existingAllocation = await db.query(
      'SELECT allocation_id FROM vendor_pod_allocations WHERE vendor_id = ? AND pod_id = ?',
      [id, pod_id]
    );

    if (existingAllocation.length > 0) {
      // Update existing allocation
      await db.runQuery(
        'UPDATE vendor_pod_allocations SET allocation_percentage = ? WHERE vendor_id = ? AND pod_id = ?',
        [allocation_percentage, id, pod_id]
      );
    } else {
      // Create new allocation
      const allocationId = uuidv4();
      await db.runQuery(
        'INSERT INTO vendor_pod_allocations (allocation_id, vendor_id, pod_id, allocation_percentage) VALUES (?, ?, ?, ?)',
        [allocationId, id, pod_id, allocation_percentage]
      );
    }

    res.json({ message: 'Pod allocation updated successfully' });

  } catch (error) {
    console.error('Update vendor allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove pod allocation for vendor
router.delete('/:id/allocations/:pod_id', authenticateToken, async (req, res) => {
  try {
    const { id, pod_id } = req.params;

    await db.runQuery(
      'DELETE FROM vendor_pod_allocations WHERE vendor_id = ? AND pod_id = ?',
      [id, pod_id]
    );

    res.json({ message: 'Pod allocation removed successfully' });

  } catch (error) {
    console.error('Remove vendor allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor comparison data
router.get('/:id/comparison', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_month, end_month, compare_with } = req.query;

    let comparisonQuery = `
      SELECT
        v.vendor_name,
        i.invoice_month,
        COUNT(i.invoice_id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_amount,
        COALESCE(AVG(i.amount), 0) as average_amount
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
      WHERE i.vendor_id = ?
    `;

    const params = [id];

    if (start_month && end_month) {
      comparisonQuery += ' AND i.invoice_month BETWEEN ? AND ?';
      params.push(start_month, end_month);
    }

    comparisonQuery += ' GROUP BY i.invoice_month ORDER BY i.invoice_month';

    const vendorData = await db.query(comparisonQuery, params);

    let compareData = [];
    if (compare_with) {
      const compareQuery = `
        SELECT
          v.vendor_name as compare_vendor_name,
          i.invoice_month,
          COUNT(i.invoice_id) as compare_invoice_count,
          COALESCE(SUM(i.amount), 0) as compare_total_amount,
          COALESCE(AVG(i.amount), 0) as compare_average_amount
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
        WHERE i.vendor_id = ?
        ${start_month && end_month ? 'AND i.invoice_month BETWEEN ? AND ?' : ''}
        GROUP BY i.invoice_month ORDER BY i.invoice_month
      `;

      const compareParams = [compare_with];
      if (start_month && end_month) {
        compareParams.push(start_month, end_month);
      }

      compareData = await db.query(compareQuery, compareParams);
    }

    // Merge comparison data
    const mergedData = vendorData.map(item => {
      const compareItem = compareData.find(c => c.invoice_month === item.invoice_month);
      return {
        ...item,
        compare_vendor_name: compareItem?.compare_vendor_name,
        compare_invoice_count: compareItem?.compare_invoice_count || 0,
        compare_total_amount: compareItem?.compare_total_amount || 0,
        compare_average_amount: compareItem?.compare_average_amount || 0,
        variance_percentage: compareItem ?
          ((item.total_amount - compareItem.compare_total_amount) / compareItem.compare_total_amount * 100).toFixed(2) :
          null
      };
    });

    res.json({
      vendor: vendorData[0]?.vendor_name || 'Unknown',
      data: mergedData
    });

  } catch (error) {
    console.error('Vendor comparison error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;