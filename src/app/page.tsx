import { redirect } from "next/navigation";

export default function Home() {
  // Tidak ada lagi pintu masuk langsung ke area admin: semua masuk lewat login.
  redirect("/login");
}
