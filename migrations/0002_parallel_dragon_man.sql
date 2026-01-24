ALTER TABLE "projects" ADD COLUMN "bookbox_structure" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "voice_audit_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "semantic_check_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "min_words_per_chapter" integer DEFAULT 1500;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "max_words_per_chapter" integer DEFAULT 3500;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "kindle_unlimited_optimized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "heartbeat_at" timestamp;