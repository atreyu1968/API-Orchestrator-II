CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"level" text DEFAULT 'info' NOT NULL,
	"agent_role" text,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"agent_name" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"current_task" text,
	"last_activity" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"agent_name" text NOT NULL,
	"model" text DEFAULT 'gemini-2.5-pro' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"thinking_tokens" integer DEFAULT 0 NOT NULL,
	"input_cost_usd" text DEFAULT '0' NOT NULL,
	"output_cost_usd" text DEFAULT '0' NOT NULL,
	"total_cost_usd" text DEFAULT '0' NOT NULL,
	"chapter_number" integer,
	"operation" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text,
	"content" text,
	"original_content" text,
	"word_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"needs_revision" boolean DEFAULT false,
	"revision_reason" text,
	"continuity_state" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "continuity_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"synopsis" text,
	"character_states" jsonb DEFAULT '[]'::jsonb,
	"unresolved_threads" jsonb DEFAULT '[]'::jsonb,
	"world_state_changes" jsonb DEFAULT '[]'::jsonb,
	"key_events" jsonb DEFAULT '[]'::jsonb,
	"token_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extended_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"original_file_name" text NOT NULL,
	"content" text NOT NULL,
	"word_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imported_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"manuscript_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text,
	"original_content" text NOT NULL,
	"edited_content" text,
	"changes_log" text,
	"word_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imported_manuscripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_file_name" text NOT NULL,
	"detected_language" text,
	"target_language" text DEFAULT 'es',
	"total_chapters" integer DEFAULT 0,
	"processed_chapters" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"parsing_errors" text,
	"total_input_tokens" integer DEFAULT 0,
	"total_output_tokens" integer DEFAULT 0,
	"total_thinking_tokens" integer DEFAULT 0,
	"series_id" integer,
	"series_order" integer,
	"pseudonym_id" integer,
	"total_word_count" integer DEFAULT 0,
	"continuity_snapshot" jsonb,
	"continuity_analysis_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"position" integer NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"added_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"premise" text,
	"genre" text DEFAULT 'fantasy' NOT NULL,
	"tone" text DEFAULT 'dramatic' NOT NULL,
	"chapter_count" integer DEFAULT 5 NOT NULL,
	"has_prologue" boolean DEFAULT false NOT NULL,
	"has_epilogue" boolean DEFAULT false NOT NULL,
	"has_author_note" boolean DEFAULT false NOT NULL,
	"pseudonym_id" integer,
	"style_guide_id" integer,
	"extended_guide_id" integer,
	"work_type" text DEFAULT 'standalone' NOT NULL,
	"series_id" integer,
	"series_order" integer,
	"status" text DEFAULT 'idle' NOT NULL,
	"current_chapter" integer DEFAULT 0,
	"revision_cycle" integer DEFAULT 0,
	"max_revision_cycles" integer DEFAULT 3,
	"final_review_result" jsonb,
	"final_score" integer,
	"total_input_tokens" integer DEFAULT 0,
	"total_output_tokens" integer DEFAULT 0,
	"total_thinking_tokens" integer DEFAULT 0,
	"min_word_count" integer,
	"architect_instructions" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pseudonyms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"default_genre" text,
	"default_tone" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'stopped' NOT NULL,
	"current_project_id" integer,
	"auto_advance" boolean DEFAULT true NOT NULL,
	"skip_on_error" boolean DEFAULT true NOT NULL,
	"pause_after_each" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reedit_audit_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"audit_type" text NOT NULL,
	"chapter_range" text,
	"score" integer,
	"findings" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reedit_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"original_chapter_number" integer,
	"title" text,
	"original_content" text NOT NULL,
	"edited_content" text,
	"editor_score" integer,
	"editor_feedback" jsonb,
	"narrative_issues" jsonb,
	"copyeditor_changes" text,
	"fluency_improvements" jsonb,
	"is_duplicate" boolean DEFAULT false,
	"duplicate_of_chapter" integer,
	"is_out_of_order" boolean DEFAULT false,
	"suggested_order" integer,
	"word_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_stage" text DEFAULT 'none',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reedit_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_file_name" text NOT NULL,
	"source_project_id" integer,
	"detected_language" text,
	"total_chapters" integer DEFAULT 0,
	"processed_chapters" integer DEFAULT 0,
	"current_stage" text DEFAULT 'uploaded' NOT NULL,
	"current_chapter" integer DEFAULT 0,
	"current_activity" text,
	"bestseller_score" integer,
	"final_review_result" jsonb,
	"structure_analysis" jsonb,
	"style_guide_id" integer,
	"pseudonym_id" integer,
	"total_input_tokens" integer DEFAULT 0,
	"total_output_tokens" integer DEFAULT 0,
	"total_thinking_tokens" integer DEFAULT 0,
	"total_word_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"heartbeat_at" timestamp,
	"cancel_requested" boolean DEFAULT false,
	"last_completed_chapter" integer DEFAULT 0,
	"expand_chapters" boolean DEFAULT false,
	"insert_new_chapters" boolean DEFAULT false,
	"target_min_words_per_chapter" integer DEFAULT 2000,
	"expansion_plan" jsonb,
	"revision_cycle" integer DEFAULT 0,
	"total_review_cycles" integer DEFAULT 0,
	"consecutive_high_scores" integer DEFAULT 0,
	"previous_scores" jsonb,
	"non_perfect_final_reviews" integer DEFAULT 0,
	"pause_reason" text,
	"pending_user_instructions" text,
	"resolved_issue_hashes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reedit_world_bibles" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"characters" jsonb,
	"locations" jsonb,
	"timeline" jsonb,
	"lore_rules" jsonb,
	"historical_period" text,
	"historical_details" jsonb,
	"extracted_from_chapters" integer,
	"confidence" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"work_type" text DEFAULT 'trilogy' NOT NULL,
	"total_planned_books" integer DEFAULT 3,
	"pseudonym_id" integer,
	"series_guide" text,
	"series_guide_file_name" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_arc_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer NOT NULL,
	"volume_number" integer NOT NULL,
	"milestone_type" text NOT NULL,
	"description" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_fulfilled" boolean DEFAULT false NOT NULL,
	"fulfilled_in_project_id" integer,
	"fulfilled_in_chapter" integer,
	"verification_notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_arc_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"volume_number" integer NOT NULL,
	"verification_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"overall_score" integer,
	"milestones_checked" integer DEFAULT 0,
	"milestones_fulfilled" integer DEFAULT 0,
	"threads_progressed" integer DEFAULT 0,
	"threads_resolved" integer DEFAULT 0,
	"findings" jsonb DEFAULT '[]'::jsonb,
	"recommendations" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_plot_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer NOT NULL,
	"thread_name" text NOT NULL,
	"description" text,
	"introduced_volume" integer NOT NULL,
	"introduced_chapter" integer,
	"resolved_volume" integer,
	"resolved_chapter" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"importance" text DEFAULT 'major' NOT NULL,
	"related_characters" text[],
	"progress_notes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"pseudonym_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thought_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"chapter_id" integer,
	"agent_name" text NOT NULL,
	"agent_role" text NOT NULL,
	"thought_content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"reedit_project_id" integer,
	"source" text DEFAULT 'original' NOT NULL,
	"project_title" text NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"chapters_translated" integer DEFAULT 0,
	"total_words" integer DEFAULT 0,
	"markdown" text NOT NULL,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "world_bibles" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb,
	"characters" jsonb DEFAULT '[]'::jsonb,
	"world_rules" jsonb DEFAULT '[]'::jsonb,
	"plot_outline" jsonb DEFAULT '{}'::jsonb,
	"plot_decisions" jsonb DEFAULT '[]'::jsonb,
	"persistent_injuries" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"chapter_reference" integer,
	"metadata" jsonb,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"proposal_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"target_name" text,
	"description" text NOT NULL,
	"original_content" text,
	"proposed_content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"reedit_project_id" integer,
	"agent_type" text NOT NULL,
	"title" text NOT NULL,
	"chapter_number" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"context_summary" text,
	"total_input_tokens" integer DEFAULT 0,
	"total_output_tokens" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_statuses" ADD CONSTRAINT "agent_statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "continuity_snapshots" ADD CONSTRAINT "continuity_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_chapters" ADD CONSTRAINT "imported_chapters_manuscript_id_imported_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."imported_manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_manuscripts" ADD CONSTRAINT "imported_manuscripts_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_manuscripts" ADD CONSTRAINT "imported_manuscripts_pseudonym_id_pseudonyms_id_fk" FOREIGN KEY ("pseudonym_id") REFERENCES "public"."pseudonyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_queue" ADD CONSTRAINT "project_queue_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_pseudonym_id_pseudonyms_id_fk" FOREIGN KEY ("pseudonym_id") REFERENCES "public"."pseudonyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_style_guide_id_style_guides_id_fk" FOREIGN KEY ("style_guide_id") REFERENCES "public"."style_guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_extended_guide_id_extended_guides_id_fk" FOREIGN KEY ("extended_guide_id") REFERENCES "public"."extended_guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_state" ADD CONSTRAINT "queue_state_current_project_id_projects_id_fk" FOREIGN KEY ("current_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reedit_audit_reports" ADD CONSTRAINT "reedit_audit_reports_project_id_reedit_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."reedit_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reedit_chapters" ADD CONSTRAINT "reedit_chapters_project_id_reedit_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."reedit_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reedit_projects" ADD CONSTRAINT "reedit_projects_source_project_id_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reedit_projects" ADD CONSTRAINT "reedit_projects_style_guide_id_style_guides_id_fk" FOREIGN KEY ("style_guide_id") REFERENCES "public"."style_guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reedit_projects" ADD CONSTRAINT "reedit_projects_pseudonym_id_pseudonyms_id_fk" FOREIGN KEY ("pseudonym_id") REFERENCES "public"."pseudonyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reedit_world_bibles" ADD CONSTRAINT "reedit_world_bibles_project_id_reedit_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."reedit_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_pseudonym_id_pseudonyms_id_fk" FOREIGN KEY ("pseudonym_id") REFERENCES "public"."pseudonyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_arc_milestones" ADD CONSTRAINT "series_arc_milestones_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_arc_milestones" ADD CONSTRAINT "series_arc_milestones_fulfilled_in_project_id_projects_id_fk" FOREIGN KEY ("fulfilled_in_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_arc_verifications" ADD CONSTRAINT "series_arc_verifications_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_arc_verifications" ADD CONSTRAINT "series_arc_verifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_plot_threads" ADD CONSTRAINT "series_plot_threads_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_guides" ADD CONSTRAINT "style_guides_pseudonym_id_pseudonyms_id_fk" FOREIGN KEY ("pseudonym_id") REFERENCES "public"."pseudonyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thought_logs" ADD CONSTRAINT "thought_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thought_logs" ADD CONSTRAINT "thought_logs_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_reedit_project_id_reedit_projects_id_fk" FOREIGN KEY ("reedit_project_id") REFERENCES "public"."reedit_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_bibles" ADD CONSTRAINT "world_bibles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;