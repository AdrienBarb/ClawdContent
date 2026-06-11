-- Keep the autopilot media plan on the draft so media can be regenerated.
ALTER TABLE "post_suggestion" ADD COLUMN "mediaPlan" JSONB;
