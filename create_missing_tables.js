
const { neon } = require('@neondatabase/serverless');

async function createMissingTables() {
  console.log('Creating missing tables manually...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Create settings table
    console.log('Creating settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" text PRIMARY KEY DEFAULT 'default',
        "whatsapp_number" text,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    
    // Insert default settings
    console.log('Inserting default settings...');
    await sql`
      INSERT INTO "settings" ("id", "whatsapp_number") 
      VALUES ('default', '+2348065343725') 
      ON CONFLICT (id) DO NOTHING
    `;
    
    console.log('✅ Settings table created and default data inserted successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
}

createMissingTables();
