CREATE TYPE "public"."membership_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "status" "membership_status" DEFAULT 'accepted' NOT NULL;