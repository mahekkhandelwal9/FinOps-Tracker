const db = require('../config/database');

async function updateVendorDocumentsTable() {
  try {
    console.log('Updating vendor_documents table with new fields...');

    // Add new columns for file metadata (one at a time for SQLite)
    await db.runQuery(`
      ALTER TABLE vendor_documents
      ADD COLUMN file_size INTEGER
    `);

    await db.runQuery(`
      ALTER TABLE vendor_documents
      ADD COLUMN mime_type TEXT
    `);

    console.log('✅ vendor_documents table updated successfully');

  } catch (error) {
    // Check if the error is about duplicate columns (which is fine)
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Columns already exist in vendor_documents table');
    } else {
      console.error('❌ Error updating vendor_documents table:', error);
      process.exit(1);
    }
  }
}

// Run the migration
updateVendorDocumentsTable().then(() => {
  console.log('🎉 Migration completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});