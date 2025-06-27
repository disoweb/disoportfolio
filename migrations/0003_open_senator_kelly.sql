CREATE TYPE "public"."referral_status" AS ENUM('pending', 'confirmed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'completed', 'rejected');--> statement-breakpoint
CREATE TABLE "referral_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"total_earned" numeric(10, 2) DEFAULT '0.00',
	"total_withdrawn" numeric(10, 2) DEFAULT '0.00',
	"pending_earnings" numeric(10, 2) DEFAULT '0.00',
	"available_balance" numeric(10, 2) DEFAULT '0.00',
	"total_referrals" integer DEFAULT 0,
	"successful_referrals" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'default' NOT NULL,
	"commission_percentage" numeric(5, 2) DEFAULT '10.00',
	"minimum_withdrawal" numeric(10, 2) DEFAULT '50.00',
	"payout_schedule" varchar DEFAULT 'monthly',
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_user_id" varchar NOT NULL,
	"order_id" uuid,
	"commission_amount" numeric(10, 2) NOT NULL,
	"commission_percentage" numeric(5, 2) NOT NULL,
	"status" "referral_status" DEFAULT 'pending',
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"whatsapp_number" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar NOT NULL,
	"payment_details" jsonb NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending',
	"admin_notes" text,
	"processed_at" timestamp,
	"processed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by" varchar;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");