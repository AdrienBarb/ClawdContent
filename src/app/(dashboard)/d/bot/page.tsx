import { redirect } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";

export default function BotPage() {
  redirect(appRouter.dashboard);
}
