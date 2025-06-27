ALTER TYPE "public"."payment_status" ADD VALUE 'pending' BEFORE 'succeeded';--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"session_token" varchar NOT NULL,
	"service_id" varchar NOT NULL,
	"service_data" jsonb NOT NULL,
	"contact_data" jsonb,
	"selected_add_ons" jsonb DEFAULT '[]',
	"total_price" integer NOT NULL,
	"user_id" varchar,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "checkout_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "service_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total_price" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "start_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "due_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "price_usd" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "timeline_weeks" integer DEFAULT 4;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "timeline_days" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "progress_percentage" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "original_price_usd" varchar;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "duration" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "spots_remaining" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "total_spots" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "features" text NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "add_ons" text NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "recommended" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "industry" text NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");