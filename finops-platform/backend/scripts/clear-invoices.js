const db = require('../config/database');

async function clearInvoices() {
  try {
    console.log('🗑️  Clearing all invoices from the database...');

    // Delete all invoices
    const deleteInvoicesResult = await db.runQuery('DELETE FROM invoices');
    console.log(`✅ Deleted all invoice records`);

    // Delete any alerts related to invoices
    const deleteAlertsResult = await db.runQuery('DELETE FROM alerts WHERE related_invoice_id IS NOT NULL');
    console.log(`✅ Deleted invoice-related alerts`);

    console.log('\n🎉 Invoice clearing completed successfully!');
    console.log('All invoice data has been removed from the database.');

  } catch (error) {
    console.error('❌ Error clearing invoices:', error.message);
  } finally {
    db.close();
  }
}

clearInvoices();