-- Drop strategy, image-generation/credits stack, and chat
ALTER TABLE "user" DROP COLUMN IF EXISTS "strategy";
ALTER TABLE "user" DROP COLUMN IF EXISTS "goal";

DROP TABLE IF EXISTS "image_generation";
DROP TABLE IF EXISTS "credit_transaction";
DROP TABLE IF EXISTS "credit_balance";
DROP TABLE IF EXISTS "chat_message";
