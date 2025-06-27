
CREATE TABLE IF NOT EXISTS "settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"whatsapp_number" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Insert default settings
INSERT INTO "settings" ("id", "whatsapp_number") 
VALUES ('default', '+2347044688788') 
ON CONFLICT ("id") DO NOTHING;
