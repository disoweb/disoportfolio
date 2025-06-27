
const { neon } = require('@neondatabase/serverless');

async function createMissingTables() {
  console.log('🔧 Creating missing tables directly via SQL...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Create settings table with proper structure
    console.log('📊 Creating settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" text PRIMARY KEY DEFAULT 'default',
        "whatsapp_number" text,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    
    // Insert default settings record
    console.log('📝 Inserting default settings...');
    await sql`
      INSERT INTO "settings" ("id", "whatsapp_number") 
      VALUES ('default', '+2348065343725') 
      ON CONFLICT (id) DO UPDATE SET 
        whatsapp_number = EXCLUDED.whatsapp_number,
        updated_at = now()
    `;
    
    // Verify the table was created and data inserted
    console.log('🔍 Verifying settings table...');
    const result = await sql`SELECT * FROM "settings" WHERE id = 'default'`;
    console.log('✅ Settings table verification:', result);
    
    console.log('🎉 All missing tables created successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createMissingTables();
