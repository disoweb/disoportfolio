import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon with error handling
try {
  neonConfig.webSocketConstructor = ws;
} catch (error) {
  console.warn('WebSocket configuration failed, continuing with default config:', error);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('🔍 DEBUG: Database connection setup');
console.log('🔍 DEBUG: DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 DEBUG: DATABASE_URL length:', process.env.DATABASE_URL.length);

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

console.log('🔍 DEBUG: Database connection established');
console.log('🔍 DEBUG: Schema imported successfully');