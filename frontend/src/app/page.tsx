import { redirect } from "next/navigation";

// Root halaman langsung redirect ke /login (server-side, instant)
// Layout dashboard akan mengarahkan ke /dashboard jika sudah login
export default function IndexPage() {
  redirect("/login");
}
