import { LoginClient } from "@/components/routes/LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return <LoginClient />;
}
