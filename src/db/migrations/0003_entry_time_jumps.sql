CREATE TYPE "public"."time_jump_kind" AS ENUM('flashback', 'flash_forward', 'time_travel');--> statement-breakpoint
CREATE TABLE "entry_time_jumps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"kind" time_jump_kind NOT NULL,
	"note" text,
	"sort_key" text COLLATE "C" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_time_jumps" ADD CONSTRAINT "entry_time_jumps_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_time_jumps_entry_idx" ON "entry_time_jumps" USING btree ("entry_id");