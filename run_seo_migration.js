
const { neon } = require('@neondatabase/serverless');

async function runSeoMigration() {
  console.log('Running SEO tables migration directly...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Create SEO settings table
    await sql`
      CREATE TABLE IF NOT EXISTS "seo_settings" (
        "id" varchar PRIMARY KEY NOT NULL,
        "site_name" varchar,
        "site_description" text,
        "site_url" varchar,
        "default_meta_title" varchar,
        "default_meta_description" text,
        "default_keywords" text,
        "google_analytics_id" varchar,
        "google_search_console_id" varchar,
        "google_tag_manager_id" varchar,
        "facebook_pixel_id" varchar,
        "twitter_handle" varchar,
        "organization_schema" jsonb,
        "robots_txt" text,
        "sitemap_enabled" boolean DEFAULT true,
        "breadcrumbs_enabled" boolean DEFAULT true,
        "open_graph_enabled" boolean DEFAULT true,
        "twitter_cards_enabled" boolean DEFAULT true,
        "structured_data_enabled" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    
    // Create SEO pages table
    await sql`
      CREATE TABLE IF NOT EXISTS "seo_pages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "path" varchar NOT NULL UNIQUE,
        "title" varchar NOT NULL,
        "meta_description" text,
        "keywords" text,
        "h1_tag" varchar,
        "canonical_url" varchar,
        "no_index" boolean DEFAULT false,
        "no_follow" boolean DEFAULT false,
        "priority" numeric(2,1) DEFAULT '0.5',
        "change_frequency" varchar DEFAULT 'weekly',
        "custom_meta_tags" jsonb,
        "open_graph_data" jsonb,
        "twitter_card_data" jsonb,
        "structured_data" jsonb,
        "content_type" varchar DEFAULT 'page',
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    
    // Create SEO keywords table
    await sql`
      CREATE TABLE IF NOT EXISTS "seo_keywords" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "keyword" varchar NOT NULL,
        "target_page" varchar,
        "search_volume" integer,
        "difficulty" numeric(5,2),
        "current_ranking" integer,
        "target_ranking" integer,
        "notes" text,
        "is_active" boolean DEFAULT true,
        "last_checked" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    
    // Create SEO audits table
    await sql`
      CREATE TABLE IF NOT EXISTS "seo_audits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "audit_type" varchar NOT NULL,
        "page" varchar,
        "status" varchar DEFAULT 'pending',
        "score" integer,
        "findings" jsonb,
        "recommendations" jsonb,
        "notes" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    
    // Create SEO analytics table
    await sql`
      CREATE TABLE IF NOT EXISTS "seo_analytics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "page" varchar NOT NULL,
        "date" varchar NOT NULL,
        "views" integer DEFAULT 0,
        "clicks" integer DEFAULT 0,
        "impressions" integer DEFAULT 0,
        "average_position" numeric(4,2),
        "click_through_rate" numeric(5,4),
        "created_at" timestamp DEFAULT now()
      )
    `;
    
    // Create SEO rules table
    await sql`
      CREATE TABLE IF NOT EXISTS "seo_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "description" text,
        "rule_type" varchar NOT NULL,
        "conditions" jsonb,
        "actions" jsonb,
        "priority" integer DEFAULT 1,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    
    // Insert default SEO settings
    await sql`
      INSERT INTO "seo_settings" (
        "id", "site_name", "site_description", "site_url",
        "default_meta_title", "default_meta_description", "default_keywords",
        "sitemap_enabled", "open_graph_enabled", "structured_data_enabled"
      ) VALUES (
        'global',
        'DiSO Webs',
        'Professional web development and digital solutions',
        'https://disoweb.replit.app',
        'DiSO Webs - Professional Web Development Services',
        'Transform your digital presence with DiSO Webs. We create stunning websites, web applications, and digital solutions that drive results.',
        'web development, website design, digital solutions, web applications, responsive design',
        true,
        true,
        true
      ) ON CONFLICT (id) DO NOTHING
    `;
    
    // Insert default SEO pages
    await sql`
      INSERT INTO "seo_pages" ("path", "title", "meta_description", "keywords", "priority", "change_frequency") VALUES
      ('/', 'DiSO Webs - Professional Web Development Services', 'Transform your business with stunning, high-performance websites. We deliver exceptional digital experiences for startups to enterprises.', 'web development, website design, Nigeria, digital solutions', '1.0', 'weekly'),
      ('/services', 'Web Development Services - DiSO Webs', 'Explore our comprehensive web development packages: Landing Pages, E-commerce Solutions, and Custom Web Applications.', 'web development services, website packages, e-commerce development', '0.9', 'weekly'),
      ('/about', 'About Us - DiSO Webs', 'Learn about DiSO Webs, a professional web development company creating digital experiences that drive results.', 'about DiSO Webs, web development company, digital agency', '0.7', 'monthly'),
      ('/contact', 'Contact Us - DiSO Webs', 'Get in touch with DiSO Webs for your web development needs. Free consultation available.', 'contact DiSO Webs, web development consultation', '0.8', 'monthly')
      ON CONFLICT (path) DO NOTHING
    `;
    
    // Insert sample SEO keywords
    await sql`
      INSERT INTO "seo_keywords" ("keyword", "target_page", "search_volume", "difficulty", "target_ranking") VALUES
      ('web development Nigeria', '/', 1200, 65.5, 10),
      ('website design Lagos', '/', 800, 58.2, 15),
      ('e-commerce development', '/services', 950, 72.1, 20),
      ('custom web applications', '/services', 600, 68.9, 25),
      ('responsive website design', '/services', 1100, 55.8, 12)
      ON CONFLICT DO NOTHING
    `;
    
    console.log('✅ SEO tables migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runSeoMigration();
