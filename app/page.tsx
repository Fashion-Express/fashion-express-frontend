import { redirect } from "next/navigation";

/** The console has no marketing surface; "/" is just the way in. */
export default function Home() {
  redirect("/dashboard");
}
