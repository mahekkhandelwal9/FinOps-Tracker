const db = require('../config/database');

async function addVendorDocumentsTable() {
  try {
    console.log('Adding vendor_documents table...');

    // Create vendor_documents table
    await db.runQuery(`
      CREATE TABLE IF NOT EXISTS vendor_documents (
        document_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        document_name TEXT NOT NULL,
        document_type TEXT DEFAULT 'Agreement',
        file_path TEXT,
        description TEXT,
        tags TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
      )
    `);

    // Create indexes for better performance
    await db.runQuery(`
      CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor_id
      ON vendor_documents(vendor_id)
    `);

    await db.runQuery(`
      CREATE INDEX IF NOT EXISTS idx_vendor_documents_type
      ON vendor_documents(document_type)
    `);

    console.log('✅ vendor_documents table created successfully');

  } catch (error) {
    console.error('❌ Error adding vendor_documents table:', error);
    process.exit(1);
  }
}

// Run the migration
addVendorDocumentsTable().then(() => {
  console.log('🎉 Migration completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});