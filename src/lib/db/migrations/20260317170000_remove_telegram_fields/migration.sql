-- AlterTable: Remove Telegram-related fields (Telegram support removed in favor of web chat)
ALTER TABLE "user" DROP COLUMN IF EXISTS "telegramBotToken";
ALTER TABLE "fly_machine" DROP COLUMN IF EXISTS "hasTelegramToken";
