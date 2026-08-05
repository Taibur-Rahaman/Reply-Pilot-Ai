import { redirect } from "next/navigation";

/** Legacy route — replaced by the redesigned app shell. */
export default function LegacyRedirect() {
  redirect("/app/customers");
}
