CREATE TYPE "public"."plan_attendance_status" AS ENUM('invited', 'going', 'maybe', 'not_going');--> statement-breakpoint
CREATE TYPE "public"."discovery_entity_type" AS ENUM('place', 'event', 'activity');--> statement-breakpoint
CREATE TYPE "public"."plan_media_kind" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."plan_media_storage_status" AS ENUM('metadata_only', 'pending', 'available', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan_memory_visibility" AS ENUM('private', 'members');--> statement-breakpoint
CREATE TYPE "public"."plan_message_type" AS ENUM('text', 'emoji', 'shared_item', 'poll', 'media', 'system');--> statement-breakpoint
CREATE TYPE "public"."plan_member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."plan_privacy" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('planning', 'confirmed', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."plan_poll_kind" AS ENUM('place', 'date', 'time');--> statement-breakpoint
CREATE TYPE "public"."plan_poll_option_kind" AS ENUM('place', 'event', 'activity', 'date', 'time');--> statement-breakpoint
CREATE TYPE "public"."plan_poll_selection_mode" AS ENUM('single', 'multiple');--> statement-breakpoint
CREATE TYPE "public"."plan_poll_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."plan_ticket_status" AS ENUM('not_applicable', 'unclaimed', 'user_reported', 'externally_confirmed');--> statement-breakpoint
CREATE TABLE "plan_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "plan_attendance_status" DEFAULT 'invited' NOT NULL,
	"ticket_status" "plan_ticket_status" DEFAULT 'not_applicable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"place_entity_type" "discovery_entity_type",
	"place_entity_id" text,
	"date_value" text,
	"time_value" text,
	"locked_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"message_id" uuid,
	"kind" "plan_media_kind" NOT NULL,
	"storage_status" "plan_media_storage_status" DEFAULT 'metadata_only' NOT NULL,
	"storage_key" text,
	"media_url" text,
	"mime_type" text,
	"byte_size" integer,
	"duration_seconds" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"role" "plan_member_role" DEFAULT 'member' NOT NULL,
	"can_finalize" boolean DEFAULT false NOT NULL,
	"can_manage_polls" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"visibility" "plan_memory_visibility" DEFAULT 'members' NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"type" "plan_message_type" DEFAULT 'text' NOT NULL,
	"body" text,
	"reply_to_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"kind" "plan_poll_option_kind" NOT NULL,
	"entity_id" text,
	"value" text,
	"added_by_user_id" text NOT NULL,
	"is_suggestion" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"voter_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"kind" "plan_poll_kind" NOT NULL,
	"question" text NOT NULL,
	"selection_mode" "plan_poll_selection_mode" DEFAULT 'single' NOT NULL,
	"allow_suggestions" boolean DEFAULT false NOT NULL,
	"status" "plan_poll_status" DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plan_shared_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"shared_by_user_id" text NOT NULL,
	"entity_type" "discovery_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"privacy" "plan_privacy" DEFAULT 'private' NOT NULL,
	"status" "plan_status" DEFAULT 'planning' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_attendance" ADD CONSTRAINT "plan_attendance_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_decisions" ADD CONSTRAINT "plan_decisions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_media" ADD CONSTRAINT "plan_media_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_media" ADD CONSTRAINT "plan_media_message_id_plan_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."plan_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_members" ADD CONSTRAINT "plan_members_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_memories" ADD CONSTRAINT "plan_memories_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_messages" ADD CONSTRAINT "plan_messages_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_poll_options" ADD CONSTRAINT "plan_poll_options_poll_id_plan_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."plan_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_poll_votes" ADD CONSTRAINT "plan_poll_votes_poll_id_plan_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."plan_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_poll_votes" ADD CONSTRAINT "plan_poll_votes_option_id_plan_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."plan_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_polls" ADD CONSTRAINT "plan_polls_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_shared_items" ADD CONSTRAINT "plan_shared_items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_shared_items" ADD CONSTRAINT "plan_shared_items_message_id_plan_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."plan_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_attendance_plan_user_idx" ON "plan_attendance" USING btree ("plan_id","user_id");--> statement-breakpoint
CREATE INDEX "plan_attendance_status_idx" ON "plan_attendance" USING btree ("plan_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_decisions_plan_idx" ON "plan_decisions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_decisions_place_idx" ON "plan_decisions" USING btree ("place_entity_type","place_entity_id");--> statement-breakpoint
CREATE INDEX "plan_media_plan_created_idx" ON "plan_media" USING btree ("plan_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_media_status_idx" ON "plan_media" USING btree ("storage_status");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_members_plan_user_idx" ON "plan_members" USING btree ("plan_id","user_id");--> statement-breakpoint
CREATE INDEX "plan_members_user_idx" ON "plan_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_memories_plan_idx" ON "plan_memories" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_memories_completed_idx" ON "plan_memories" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "plan_messages_plan_created_idx" ON "plan_messages" USING btree ("plan_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_messages_reply_idx" ON "plan_messages" USING btree ("reply_to_message_id");--> statement-breakpoint
CREATE INDEX "plan_poll_options_poll_idx" ON "plan_poll_options" USING btree ("poll_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_poll_options_entity_idx" ON "plan_poll_options" USING btree ("kind","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_poll_votes_poll_option_user_idx" ON "plan_poll_votes" USING btree ("poll_id","option_id","voter_user_id");--> statement-breakpoint
CREATE INDEX "plan_poll_votes_poll_idx" ON "plan_poll_votes" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "plan_poll_votes_voter_idx" ON "plan_poll_votes" USING btree ("voter_user_id");--> statement-breakpoint
CREATE INDEX "plan_polls_plan_status_idx" ON "plan_polls" USING btree ("plan_id","status");--> statement-breakpoint
CREATE INDEX "plan_polls_expiry_idx" ON "plan_polls" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "plan_shared_items_plan_created_idx" ON "plan_shared_items" USING btree ("plan_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_shared_items_entity_idx" ON "plan_shared_items" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "plans_creator_idx" ON "plans" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "plans_status_idx" ON "plans" USING btree ("status","updated_at");