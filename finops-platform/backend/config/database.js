const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// For Vercel serverless, use /tmp directory for database
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const dbPath = isVercel
  ? '/tmp/database.sqlite'
  : path.join(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    // Configure SQLite for better concurrent access
    db.configure("busyTimeout", 30000); // 30 second timeout
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Enable WAL mode for better concurrent access (disabled due to locking issues)
  // db.run('PRAGMA journal_mode = WAL');

  // Optimize for better performance
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = 10000');
  db.run('PRAGMA temp_store = memory');
  db.run('PRAGMA mmap_size = 268435456'); // 256MB

  // Create Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Program Manager', 'Head of Department', 'Finance Associate')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Companies table
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      company_id TEXT PRIMARY KEY,
      company_name TEXT UNIQUE NOT NULL,
      total_budget REAL NOT NULL CHECK (total_budget >= 0),
      currency TEXT DEFAULT 'INR' CHECK (currency = 'INR'),
      financial_period TEXT NOT NULL CHECK (financial_period IN ('Monthly', 'Quarterly', 'Yearly')),
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
      notes TEXT,
      FOREIGN KEY (created_by) REFERENCES users(user_id)
    )
  `);

  // Create Pods table
  db.run(`
    CREATE TABLE IF NOT EXISTS pods (
      pod_id TEXT PRIMARY KEY,
      pod_name TEXT NOT NULL,
      description TEXT,
      company_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      budget_ceiling REAL NOT NULL CHECK (budget_ceiling >= 0),
      budget_used REAL DEFAULT 0 CHECK (budget_used >= 0),
      budget_remaining REAL GENERATED ALWAYS AS (budget_ceiling - budget_used) VIRTUAL,
      budget_status TEXT GENERATED ALWAYS AS (
        CASE
          WHEN budget_used > budget_ceiling THEN 'Over Budget'
          ELSE 'Within Limit'
        END
      ) VIRTUAL,
      threshold_alert INTEGER DEFAULT 80 CHECK (threshold_alert > 0 AND threshold_alert <= 100),
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
      FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
    )
  `);

  // Create Vendors table
  db.run(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id TEXT PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      vendor_type TEXT NOT NULL CHECK (vendor_type IN ('Cloud', 'SaaS', 'Staff Augmentation', 'Other')),
      shared_status TEXT DEFAULT 'Exclusive' CHECK (shared_status IN ('Exclusive', 'Shared')),
      payment_terms TEXT,
      default_due_days INTEGER,
      poc_name TEXT,
      poc_email TEXT,
      poc_phone TEXT,
      contract_start_date DATE,
      contract_end_date DATE,
      status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Vendor-Pod mapping for shared vendors
  db.run(`
    CREATE TABLE IF NOT EXISTS vendor_pod_allocations (
      allocation_id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      pod_id TEXT NOT NULL,
      allocation_percentage REAL NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
      FOREIGN KEY (pod_id) REFERENCES pods(pod_id) ON DELETE CASCADE,
      UNIQUE(vendor_id, pod_id)
    )
  `);

  // Create Invoices table
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id TEXT PRIMARY KEY,
      invoice_title TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      pod_id TEXT NOT NULL,
      invoice_month TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      invoice_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'Overdue')),
      reminder_status TEXT DEFAULT 'Scheduled' CHECK (reminder_status IN ('Scheduled', 'Sent', 'Escalated')),
      attachment_url TEXT,
      notes TEXT,
      added_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
      FOREIGN KEY (pod_id) REFERENCES pods(pod_id),
      FOREIGN KEY (added_by) REFERENCES users(user_id)
    )
  `);

  // Create Payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL UNIQUE,
      vendor_id TEXT NOT NULL,
      pod_id TEXT NOT NULL,
      payment_date DATE NOT NULL,
      payment_amount REAL NOT NULL CHECK (payment_amount > 0),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('Bank Transfer', 'Credit Card', 'UPI', 'Cheque', 'Other')),
      reference_number TEXT,
      payment_proof_url TEXT,
      recorded_by TEXT NOT NULL,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
      FOREIGN KEY (pod_id) REFERENCES pods(pod_id),
      FOREIGN KEY (recorded_by) REFERENCES users(user_id)
    )
  `);

  // Create Alerts/Reminders table
  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      alert_id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL CHECK (alert_type IN ('Invoice Due', 'Invoice Overdue', 'Budget Threshold', 'Manual')),
      related_invoice_id TEXT,
      related_pod_id TEXT,
      alert_message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High')),
      due_date DATE,
      trigger_date DATETIME NOT NULL,
      status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Acknowledged', 'Resolved')),
      sent_to TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (related_invoice_id) REFERENCES invoices(invoice_id),
      FOREIGN KEY (related_pod_id) REFERENCES pods(pod_id)
    )
  `);

  // Create Budget Categories table for pod-level category budgets
  db.run(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      category_id TEXT PRIMARY KEY,
      pod_id TEXT NOT NULL,
      category_name TEXT NOT NULL CHECK (category_name IN ('Cloud', 'SaaS', 'Staff Augmentation', 'Other')),
      allocated_amount REAL NOT NULL CHECK (allocated_amount >= 0),
      utilized_amount REAL DEFAULT 0 CHECK (utilized_amount >= 0),
      remaining_amount REAL GENERATED ALWAYS AS (allocated_amount - utilized_amount) VIRTUAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pod_id) REFERENCES pods(pod_id) ON DELETE CASCADE,
      UNIQUE(pod_id, category_name)
    )
  `);

  // Create Company Notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS company_notes (
      note_id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(user_id)
    )
  `);

  // Add description column to companies table if it doesn't exist
  db.run(`
    ALTER TABLE companies ADD COLUMN description TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding description column:', err.message);
    }
  });

  // Add deleted tracking columns to company_notes table if they don't exist
  db.run(`
    ALTER TABLE company_notes ADD COLUMN deleted_by TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding deleted_by column:', err.message);
    }
  });

  db.run(`
    ALTER TABLE company_notes ADD COLUMN deleted_at DATETIME
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding deleted_at column:', err.message);
    }
  });

  console.log('Database tables initialized successfully!');
}

// Helper function to retry database operations with exponential backoff
async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff: 200ms, 400ms, 800ms
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Helper function to run queries with promises and retry logic
db.query = function(sql, params = []) {
  return retryOperation(() => {
    return new Promise((resolve, reject) => {
      this.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
};

db.runQuery = function(sql, params = []) {
  return retryOperation(() => {
    return new Promise((resolve, reject) => {
      this.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  });
};

module.exports = db;