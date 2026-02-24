import { redirect } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";

export default function CheckoutSuccessPage() {
  redirect(appRouter.dashboard);
}
