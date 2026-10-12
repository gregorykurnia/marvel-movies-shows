-- Enables trigram indexes (fuzzy name search). Added by hand: drizzle-kit does not emit extensions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."backup_kind" AS ENUM('manual', 'automatic', 'pre_restore');--> statement-breakpoint
CREATE TYPE "public"."character_status" AS ENUM('alive', 'deceased', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."character_importance" AS ENUM('major', 'minor');--> statement-breakpoint
CREATE TYPE "public"."title_kind" AS ENUM('movie', 'show');--> statement-breakpoint
CREATE TABLE "appearances" (
	"character_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	CONSTRAINT "appearances_character_id_entry_id_pk" PRIMARY KEY("character_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "backup_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "backup_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blob_path" text,
	"size_bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_tags" (
	"character_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "character_tags_character_id_tag_id_pk" PRIMARY KEY("character_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"importance" character_importance NOT NULL,
	"status" character_status NOT NULL,
	"universe_id" uuid,
	"predominant_title_id" uuid,
	"first_entry_id" uuid,
	"last_entry_id" uuid,
	"notes" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("notes", ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"season_number" integer,
	"episode_number" integer,
	"name" text,
	"release_date" date,
	"in_universe_year" integer,
	"sort_key" text COLLATE "C" NOT NULL,
	"watched" boolean DEFAULT false NOT NULL,
	"recap" text,
	"notes" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("recap", '') || ' ' || coalesce("notes", ''))) STORED,
	CONSTRAINT "entries_sort_key_unique" UNIQUE("sort_key"),
	CONSTRAINT "entries_title_season_episode_uq" UNIQUE("title_id","season_number","episode_number")
);
--> statement-breakpoint
CREATE TABLE "entry_tags" (
	"entry_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "entry_tags_entry_id_tag_id_pk" PRIMARY KEY("entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "event_tags" (
	"event_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "event_tags_event_id_tag_id_pk" PRIMARY KEY("event_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"text" text NOT NULL,
	"details" text,
	"title_id" uuid,
	"entry_id" uuid,
	"sort_key" text COLLATE "C" NOT NULL,
	"notes" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("text", '') || ' ' || coalesce("details", '') || ' ' || coalesce("notes", ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "title_kind" NOT NULL,
	"release_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "universes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_tags" ADD CONSTRAINT "character_tags_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_tags" ADD CONSTRAINT "character_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_predominant_title_id_titles_id_fk" FOREIGN KEY ("predominant_title_id") REFERENCES "public"."titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_first_entry_id_entries_id_fk" FOREIGN KEY ("first_entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_last_entry_id_entries_id_fk" FOREIGN KEY ("last_entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_timeline_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."timeline_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_name_trgm" ON "characters" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "characters_search_idx" ON "characters" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "entries_search_idx" ON "entries" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_lower_uq" ON "tags" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "tags_name_trgm" ON "tags" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "timeline_events_year_sort_idx" ON "timeline_events" USING btree ("year","sort_key");--> statement-breakpoint
CREATE INDEX "timeline_events_search_idx" ON "timeline_events" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "titles_name_trgm" ON "titles" USING gin ("name" gin_trgm_ops);