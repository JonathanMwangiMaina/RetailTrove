import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Connecting to Supabase...');

    const client = await pool.connect();
    console.log('✅ Connected successfully!');

    console.log('📂 Reading migration file...');
    const sql = readFileSync(join(__dirname, 'migrations/0000_famous_firebird.sql'), 'utf-8');

    // Split by statement breakpoint and filter empty statements
    const statements = sql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    console.log('⏳ Importing schema...\n');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.query(statement);
        // Extract table name from CREATE TABLE or ALTER TABLE for better logging
        const match = statement.match(/(?:CREATE TABLE|ALTER TABLE)\s+"?(\w+)"?/i);
        const tableName = match ? match[1] : `statement ${i + 1}`;
        console.log(`  ✓ ${tableName}`);
      } catch (error) {
        console.error(`  ✗ Error in statement ${i + 1}:`, error.message);
        throw error;
      }
    }

    client.release();
    await pool.end();

    console.log('\n✅ Schema imported successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - banner_settings');
    console.log('  - cart_items');
    console.log('  - faqs');
    console.log('  - order_items');
    console.log('  - orders');
    console.log('  - products');
    console.log('  - site_content');
    console.log('  - site_settings');
    console.log('  - user_visits');
    console.log('  - users');
    console.log('\n🎉 Ready to start the server: npm run dev');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

importSchema();
