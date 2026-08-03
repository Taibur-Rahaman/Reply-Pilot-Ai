import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/config";

/** Legacy URL — use /login */
export default function DashboardLoginRedirect() {
  redirect(LOGIN_PATH);
}
