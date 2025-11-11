#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

const command = process.argv[2];
const args = process.argv.slice(3);

console.log('🗄️  FinOps Database CLI');
console.log(`📍 Database: ${dbPath}\n`);

function showHelp() {
  console.log('Usage: node db-cli.js <command> [options]\n');
  console.log('Commands:');
  console.log('  tables                    List all tables');
  console.log('  query <sql>               Execute SQL query');
  console.log('  schema [table]            Show table schema');
  console.log('  recent                    Show recent notes with user info');
  console.log('  help                      Show this help message\n');
  console.log('Examples:');
  console.log('  node db-cli.js tables');
  console.log('  node db-cli.js query "SELECT * FROM companies LIMIT 5"');
  console.log('  node db-cli.js schema company_notes');
  console.log('  node db-cli.js recent');
}

function listTables() {
  const db = new sqlite3.Database(dbPath);
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('📋 Tables in database:');
      rows.forEach(row => {
        console.log(`   - ${row.name}`);
      });
    }
    db.close();
  });
}

function executeQuery(sql) {
  const db = new sqlite3.Database(dbPath);
  console.log(`🔍 Executing: ${sql}\n`);

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else if (rows.length === 0) {
      console.log('📄 No results');
    } else {
      console.table(rows);
    }
    db.close();
  });
}

function showSchema(tableName) {
  const db = new sqlite3.Database(dbPath);

  if (tableName) {
    console.log(`📐 Schema for ${tableName}:`);
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
      if (err) {
        console.error('❌ Error:', err.message);
      } else {
        console.table(rows);
      }
      db.close();
    });
  } else {
    db.all("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
      if (err) {
        console.error('❌ Error:', err.message);
      } else {
        console.log('📐 Database Schema:');
        rows.forEach((row, index) => {
          console.log(`\n${index + 1}. ${row.sql}`);
        });
      }
      db.close();
    });
  }
}

function showRecentNotes() {
  const db = new sqlite3.Database(dbPath);

  const sql = `
    SELECT
      cn.note_id,
      cn.note_text,
      cn.created_at,
      cn.deleted_at,
      cn.deleted_by,
      u.name as created_by_name,
      du.name as deleted_by_name
    FROM company_notes cn
    LEFT JOIN users u ON cn.created_by = u.user_id
    LEFT JOIN users du ON cn.deleted_by = du.user_id
    ORDER BY cn.created_at DESC
    LIMIT 10
  `;

  console.log('📝 Recent Notes (with user info):\n');

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else if (rows.length === 0) {
      console.log('📄 No notes found');
    } else {
      console.table(rows);

      console.log('\n📊 Summary:');
      console.log(`   Total notes shown: ${rows.length}`);
      const deletedCount = rows.filter(r => r.deleted_at !== null).length;
      console.log(`   Active notes: ${rows.length - deletedCount}`);
      console.log(`   Deleted notes: ${deletedCount}`);
    }
    db.close();
  });
}

// Main command router
switch (command) {
  case 'tables':
    listTables();
    break;

  case 'query':
    if (!args.length) {
      console.error('❌ Error: Please provide SQL query');
      console.log('Usage: node db-cli.js query "SELECT * FROM table_name"');
    } else {
      executeQuery(args.join(' '));
    }
    break;

  case 'schema':
    showSchema(args[0]);
    break;

  case 'recent':
    showRecentNotes();
    break;

  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  default:
    if (!command) {
      showHelp();
    } else {
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
    }
}