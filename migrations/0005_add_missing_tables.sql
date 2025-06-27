
-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "settings" (
  "id" text PRIMARY KEY DEFAULT 'default',
  "whatsapp_number" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Insert default settings
INSERT INTO "settings" ("id", "whatsapp_number") 
VALUES ('default', '+2348065343725') 
ON CONFLICT (id) DO NOTHING;

-- Fix SEO analytics table to match schema
DROP TABLE IF EXISTS "seo_analytics";
CREATE TABLE "seo_analytics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "page" varchar NOT NULL,
  "date" date NOT NULL,
  "page_views" integer DEFAULT 0,
  "unique_visitors" integer DEFAULT 0,
  "bounce_rate" numeric(5,2),
  "avg_time_on_page" integer,
  "organic_traffic" integer DEFAULT 0,
  "click_through_rate" numeric(5,2),
  "impressions" integer DEFAULT 0,
  "clicks" integer DEFAULT 0,
  "avg_position" numeric(4,1),
  "created_at" timestamp DEFAULT now()
);

-- Update SEO audits table to match schema
ALTER TABLE "seo_audits" 
  DROP COLUMN IF EXISTS "findings",
  DROP COLUMN IF EXISTS "recommendations",
  ADD COLUMN IF NOT EXISTS "issues" jsonb,
  ADD COLUMN IF NOT EXISTS "recommendations" jsonb,
  ADD COLUMN IF NOT EXISTS "performed_by" varchar REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

-- Update SEO settings table to match schema
ALTER TABLE "seo_settings" 
  ADD COLUMN IF NOT EXISTS "google_search_console_id" varchar,
  ADD COLUMN IF NOT EXISTS "facebook_pixel_id" varchar,
  ADD COLUMN IF NOT EXISTS "twitter_handle" varchar,
  ADD COLUMN IF NOT EXISTS "organization_schema" jsonb,
  ADD COLUMN IF NOT EXISTS "robots_txt" text,
  ADD COLUMN IF NOT EXISTS "breadcrumbs_enabled" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "twitter_cards_enabled" boolean DEFAULT true;

-- Create SEO content type and rule type enums if they don't exist
DO $$ BEGIN
  CREATE TYPE "seo_content_type" AS ENUM('page', 'service', 'project', 'blog');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "seo_rule_type" AS ENUM('meta', 'schema', 'content', 'technical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update SEO pages table to match schema
ALTER TABLE "seo_pages"
  ALTER COLUMN "content_type" TYPE varchar USING "content_type"::varchar;

-- Update SEO rules table to match schema  
ALTER TABLE "seo_rules"
  ALTER COLUMN "rule_type" TYPE varchar USING "rule_type"::varchar;
