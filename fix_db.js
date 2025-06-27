
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
-- Drop the existing table if it exists
DROP TABLE IF EXISTS "password_reset_tokens";

-- Create the table with the correct schema
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);

-- Create indexes for better performance
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");

-- Add foreign key constraint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
`;

async function fixDatabase() {
  try {
    console.log('Fixing password_reset_tokens table...');
    await pool.query(sql);
    console.log('Table fixed successfully!');
  } catch (error) {
    console.error('Error fixing table:', error);
  } finally {
    await pool.end();
  }
}

fixDatabase();
