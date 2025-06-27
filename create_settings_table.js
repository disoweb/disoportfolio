
const { Pool } = require('pg');

async function createSettingsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Creating settings table...');
    
    // Create the settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
        "whatsapp_number" text,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    console.log('Settings table created successfully!');
    
    // Insert default settings
    await pool.query(`
      INSERT INTO "settings" ("id", "whatsapp_number") 
      VALUES ('default', '+2348065343725') 
      ON CONFLICT ("id") DO NOTHING;
    `);
    
    console.log('Default WhatsApp number inserted successfully!');
    
  } catch (error) {
    console.error('Error creating settings table:', error);
  } finally {
    await pool.end();
  }
}

createSettingsTable();
